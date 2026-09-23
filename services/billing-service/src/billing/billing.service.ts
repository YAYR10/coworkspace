import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventBus } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from './payment-gateway.service';

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
    const result = await this.prisma.extraCharge.updateMany({ where: { bookingId: data.bookingId, status: 'APPROVED' }, data: { status: 'VOIDED' } });
    if (result.count) this.logger.log(`[booking_id=${data.bookingId}] cargo adicional anulado`);
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

  /** Número de factura electrónica simulado (en producción lo asigna el proveedor tecnológico ante la DIAN). */
  private electronicInvoiceNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FE-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
