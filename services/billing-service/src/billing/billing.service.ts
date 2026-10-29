import { BadGatewayException, BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ExtraCharge } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EventBus } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, isStaff } from '../common/current-user';
import { PaymentGatewayService } from './payment-gateway.service';
import { PlanPaymentsService } from './plan-payments.service';
import { WompiService, WompiTransaction } from './wompi.service';

export interface MembershipActivated {
  subscriptionId: string;
  memberId: string;
  planCode: string;
  planName: string;
  price: number;
  resourceAccess: string[];
  periodStart: string;
  renewsAt: string;
  isRenewal: boolean;
}

export interface BookingCreated {
  bookingId: string;
  memberId: string;
  resourceType: 'ROOM' | 'DESK';
  hours: number;
}

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly payments: PaymentGatewayService,
    private readonly wompi: WompiService,
    private readonly plans: PlanPaymentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.events.subscribe('membership.activated', (e) => this.onMembershipActivated(e.data));
    await this.events.subscribe('membership.expired', (e) => this.onMembershipExpired(e.data));
    await this.events.subscribe('booking.created', (e) => this.onBookingCreated(e.data));
    await this.events.subscribe('booking.cancelled', (e) => this.onBookingCancelled(e.data));
  }

  private hourlyRate(type: string): number {
    return type === 'ROOM' ? Number(process.env.EXTRA_ROOM_HOURLY_RATE ?? 50000) : Number(process.env.EXTRA_DESK_HOURLY_RATE ?? 15000);
  }

  /** Cobro recurrente: una factura por suscripción y periodo (idempotente). */
  async onMembershipActivated(data: MembershipActivated) {
    const plan = {
      subscriptionId: data.subscriptionId,
      planCode: data.planCode,
      planName: data.planName,
      price: data.price,
      resourceAccess: data.resourceAccess,
      status: 'ACTIVE' as const,
      renewsAt: new Date(data.renewsAt),
    };
    await this.prisma.memberPlan.upsert({ where: { memberId: data.memberId }, create: { memberId: data.memberId, ...plan }, update: plan });

    const period = data.periodStart.slice(0, 10);
    const existing = await this.prisma.invoice.findUnique({ where: { subscriptionId_period: { subscriptionId: data.subscriptionId, period } } });
    if (existing) return existing;

    const payment = await this.payments.charge(data.memberId, data.price, 'SUBSCRIPTION');
    const invoice = await this.prisma.invoice.create({
      data: {
        memberId: data.memberId,
        subscriptionId: data.subscriptionId,
        period,
        amount: data.price,
        status: payment.approved ? 'PAID' : 'FAILED',
        electronicNumber: payment.approved ? this.electronicInvoiceNumber() : null,
        failureReason: payment.reason,
      },
    });
    await this.events.publish(payment.approved ? 'billing.invoice.paid' : 'billing.invoice.failed', {
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.amount,
      period,
      electronicNumber: invoice.electronicNumber,
    });
    this.logger.log(`Factura ${invoice.status} para ${data.memberId} (${data.planCode}, periodo ${period})`);
    return invoice;
  }

  async onMembershipExpired(data: { memberId: string }) {
    await this.prisma.memberPlan.updateMany({ where: { memberId: data.memberId }, data: { status: 'EXPIRED' } });
  }

  /** Paso de la saga: decide si la reserva genera cargo adicional y responde a Booking. */
  async onBookingCreated(data: BookingCreated) {
    const previous = await this.prisma.extraCharge.findUnique({ where: { bookingId: data.bookingId } });
    if (previous) {
      if (previous.status === 'PENDING') return; // sigue esperando el pago en la pasarela
      // Evento duplicado: se republica el resultado ya decidido.
      const type = previous.status === 'REJECTED' ? 'billing.charge.rejected' : 'billing.charge.approved';
      await this.events.publish(type, { bookingId: data.bookingId, memberId: data.memberId, amount: previous.amount, reason: previous.failureReason });
      return;
    }

    const plan = await this.prisma.memberPlan.findUnique({ where: { memberId: data.memberId } });
    const hasActivePlan = plan?.status === 'ACTIVE';
    if (hasActivePlan && plan.resourceAccess.includes(data.resourceType)) {
      await this.events.publish('billing.charge.approved', { bookingId: data.bookingId, memberId: data.memberId, amount: 0, covered: true });
      return;
    }

    const amount = Math.ceil(data.hours * this.hourlyRate(data.resourceType));
    const reason = hasActivePlan
      ? `Uso de ${data.resourceType} fuera del plan ${plan.planCode} (${data.hours} h)`
      : `Uso de ${data.resourceType} sin membresía activa (${data.hours} h)`;
    // Con Wompi configurado, el cargo queda PENDIENTE hasta que el miembro pague en la pasarela.
    if (this.wompi.enabled) {
      const pending = await this.prisma.extraCharge.create({
        data: { memberId: data.memberId, bookingId: data.bookingId, amount, reason, status: 'PENDING' },
      });
      this.logger.log(`[booking_id=${data.bookingId}] cargo de ${amount} pendiente de pago en Wompi`);
      await this.events.publish('billing.charge.pending', { bookingId: data.bookingId, memberId: data.memberId, amount, chargeId: pending.id });
      return;
    }

    const payment = await this.payments.charge(data.memberId, amount, 'EXTRA');

    const charge = await this.prisma.extraCharge.create({
      data: {
        memberId: data.memberId,
        bookingId: data.bookingId,
        amount,
        reason,
        status: payment.approved ? 'APPROVED' : 'REJECTED',
        failureReason: payment.reason,
      },
    });

    if (payment.approved) {
      this.logger.log(`[booking_id=${data.bookingId}] cargo adicional aprobado: ${amount}`);
      await this.events.publish('billing.charge.approved', { bookingId: data.bookingId, memberId: data.memberId, amount, chargeId: charge.id, covered: false });
    } else {
      this.logger.warn(`[booking_id=${data.bookingId}] cargo adicional rechazado: ${payment.reason}`);
      await this.events.publish('billing.charge.rejected', { bookingId: data.bookingId, memberId: data.memberId, amount, reason: payment.reason });
    }
  }

  /** Si la reserva se cancela, el cargo adicional aprobado se anula (reembolso). */
  async onBookingCancelled(data: { bookingId: string }) {
    const result = await this.prisma.extraCharge.updateMany({
      where: { bookingId: data.bookingId, status: { in: ['APPROVED', 'PENDING'] } },
      data: { status: 'VOIDED' },
    });
    if (result.count) this.logger.log(`[booking_id=${data.bookingId}] cargo adicional anulado`);
  }

  // ---------- pasarela de pago (Wompi) ----------
  paymentStatus() {
    return { provider: this.wompi.enabled ? 'wompi' : 'simulado', sandbox: this.wompi.enabled ? this.wompi.sandbox : true };
  }

  private async ownCharge(user: AuthUser, bookingId: string): Promise<ExtraCharge | null> {
    const charge = await this.prisma.extraCharge.findUnique({ where: { bookingId } });
    if (charge && charge.memberId !== user.id && !isStaff(user)) throw new NotFoundException('Cobro no encontrado');
    return charge;
  }

  /** Cobro de una reserva (null si el plan la cubre o aún no se ha decidido). */
  chargeForBooking(user: AuthUser, bookingId: string) {
    return this.ownCharge(user, bookingId);
  }

  /** Crea un intento de pago y devuelve el enlace al checkout de Wompi. */
  async checkout(user: AuthUser, bookingId: string) {
    if (!this.wompi.enabled) throw new ConflictException('La pasarela de pagos no está configurada');
    const charge = await this.ownCharge(user, bookingId);
    if (!charge) throw new NotFoundException('Esta reserva no tiene cobro pendiente');
    if (charge.status !== 'PENDING') throw new ConflictException('Este cobro ya no está pendiente de pago');
    const reference = `${charge.id}.${Date.now().toString(36)}`;
    await this.prisma.extraCharge.update({ where: { id: charge.id }, data: { paymentReference: reference } });
    return { chargeId: charge.id, amount: charge.amount, reference, sandbox: this.wompi.sandbox, checkoutUrl: this.wompi.checkoutUrl(reference, charge.amount) };
  }

  /** El miembro vuelve del checkout con el id de la transacción: se consulta en Wompi y se aplica el resultado. */
  async verifyTransaction(user: AuthUser, transactionId: string) {
    const tx = await this.wompi.getTransaction(transactionId);
    if (!tx) throw new BadGatewayException('No pudimos consultar el pago en Wompi. Intenta de nuevo.');
    if (PlanPaymentsService.paymentIdOf(tx.reference)) return this.plans.verify(user, tx);
    const charge = await this.prisma.extraCharge.findUnique({ where: { id: tx.reference.split('.')[0] } });
    if (!charge || (charge.memberId !== user.id && !isStaff(user))) throw new NotFoundException('Pago no encontrado');
    const settled = await this.settle(charge, tx);
    return { kind: 'booking' as const, status: settled.status, bookingId: settled.bookingId, amount: settled.amount, transactionStatus: tx.status, message: tx.status_message ?? null };
  }

  /** Webhook de Wompi (evento transaction.updated), validado con la firma del secreto de eventos. */
  async handleWompiEvent(event: any) {
    if (!this.wompi.verifyEvent(event)) {
      this.logger.warn('Evento de Wompi con firma inválida: se ignora');
      throw new BadRequestException('Firma inválida');
    }
    if (event.event !== 'transaction.updated') return { ok: true };
    const tx = event.data?.transaction as WompiTransaction;
    if (tx?.reference && PlanPaymentsService.paymentIdOf(tx.reference)) {
      await this.plans.fromWebhook(tx);
      return { ok: true };
    }
    const charge = tx?.reference ? await this.prisma.extraCharge.findUnique({ where: { id: tx.reference.split('.')[0] } }) : null;
    if (!charge) return { ok: true };
    await this.settle(charge, tx);
    return { ok: true };
  }

  /** Aplica el resultado de la pasarela una sola vez (solo desde PENDING) y continúa la saga. */
  async settle(charge: ExtraCharge, tx: WompiTransaction): Promise<ExtraCharge> {
    if (charge.status !== 'PENDING' || tx.status === 'PENDING') return charge;
    if (tx.currency !== 'COP' || tx.amount_in_cents !== charge.amount * 100) {
      this.logger.error(`[booking_id=${charge.bookingId}] el monto pagado (${tx.amount_in_cents}) no coincide con el cobro`);
      return charge;
    }
    const approved = tx.status === 'APPROVED';
    const result = await this.prisma.extraCharge.updateMany({
      where: { id: charge.id, status: 'PENDING' },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        transactionId: tx.id,
        paymentMethod: tx.payment_method_type ?? null,
        failureReason: approved ? null : tx.status_message || `Pago ${tx.status.toLowerCase()} en Wompi`,
      },
    });
    const updated = await this.prisma.extraCharge.findUniqueOrThrow({ where: { id: charge.id } });
    if (result.count === 0) return updated; // otro proceso (webhook o consulta) ya lo aplicó
    if (approved) {
      this.logger.log(`[booking_id=${charge.bookingId}] pago aprobado en Wompi (${tx.id})`);
      await this.events.publish('billing.charge.approved', { bookingId: charge.bookingId, memberId: charge.memberId, amount: charge.amount, chargeId: charge.id, covered: false, transactionId: tx.id });
    } else {
      this.logger.warn(`[booking_id=${charge.bookingId}] pago ${tx.status} en Wompi`);
      await this.events.publish('billing.charge.rejected', { bookingId: charge.bookingId, memberId: charge.memberId, amount: charge.amount, reason: updated.failureReason });
    }
    return updated;
  }

  // ---------- consultas ----------
  invoicesOf(memberId: string) {
    return this.prisma.invoice.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' } });
  }

  allInvoices(memberId?: string) {
    return this.prisma.invoice.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  chargesOf(memberId: string) {
    return this.prisma.extraCharge.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' } });
  }

  allCharges(memberId?: string) {
    return this.prisma.extraCharge.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  /** Número de factura electrónica simulado (en producción lo asigna el proveedor tecnológico ante la DIAN). */
  private electronicInvoiceNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FE-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
