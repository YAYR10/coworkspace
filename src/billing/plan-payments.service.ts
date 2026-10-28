import { BadGatewayException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PlanPayment } from '@prisma/client';
import { AuthUser, isStaff } from '../common/current-user';
import { EventBus } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipClient } from './membership.client';
import { WompiService, WompiTransaction } from './wompi.service';

export const PLAN_REF_PREFIX = 'plan_';

/**
 * Pago de membresías con Wompi:
 *  1. El miembro elige un plan → se crea un PlanPayment PENDING y se devuelve el checkout firmado.
 *  2. Wompi devuelve a /pago (o llama el webhook) → se consulta la transacción.
 *  3. Si se aprueba → Billing pide a Membership activar el plan (REST interno) → membership.activated → factura.
 */
@Injectable()
export class PlanPaymentsService {
  private readonly logger = new Logger(PlanPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wompi: WompiService,
    private readonly membership: MembershipClient,
    private readonly events: EventBus,
  ) {}

  async checkout(user: AuthUser, planId: string) {
    if (!this.wompi.enabled) throw new ConflictException('La pasarela de pagos no está configurada');
    const plan = await this.membership.plan(planId).catch(() => {
      throw new ServiceUnavailableException('No pudimos consultar el plan, intenta de nuevo');
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    const payment = await this.prisma.planPayment.create({
      data: { memberId: user.id, planId: plan.id, planCode: plan.code, planName: plan.name, amount: plan.price },
    });
    const reference = `${PLAN_REF_PREFIX}${payment.id}.${Date.now().toString(36)}`;
    await this.prisma.planPayment.update({ where: { id: payment.id }, data: { reference } });
    this.logger.log(`[plan_payment=${payment.id}] checkout de ${plan.code} por ${plan.price}`);
    return { paymentId: payment.id, amount: plan.price, planName: plan.name, reference, sandbox: this.wompi.sandbox, checkoutUrl: this.wompi.checkoutUrl(reference, plan.price) };
  }

  static paymentIdOf(reference: string): string | null {
    return reference?.startsWith(PLAN_REF_PREFIX) ? reference.slice(PLAN_REF_PREFIX.length).split('.')[0] : null;
  }

  async verify(user: AuthUser, tx: WompiTransaction) {
    const id = PlanPaymentsService.paymentIdOf(tx.reference)!;
    const payment = await this.prisma.planPayment.findUnique({ where: { id } });
    if (!payment || (payment.memberId !== user.id && !isStaff(user))) throw new NotFoundException('Pago no encontrado');
    const settled = await this.settle(payment, tx);
    return {
      kind: 'plan' as const,
      status: settled.status,
      planName: settled.planName,
      activated: settled.activated,
      amount: settled.amount,
      transactionStatus: tx.status,
      message: tx.status_message ?? null,
    };
  }

  async fromWebhook(tx: WompiTransaction) {
    const id = PlanPaymentsService.paymentIdOf(tx.reference);
    const payment = id ? await this.prisma.planPayment.findUnique({ where: { id } }) : null;
    if (payment) await this.settle(payment, tx);
  }

  /** Aplica el resultado una sola vez; si el pago está aprobado pero el plan no se activó, reintenta la activación. */
  async settle(payment: PlanPayment, tx: WompiTransaction): Promise<PlanPayment> {
    if (payment.status === 'PENDING' && tx.status !== 'PENDING') {
      if (tx.currency !== 'COP' || tx.amount_in_cents !== payment.amount * 100) {
        this.logger.error(`[plan_payment=${payment.id}] el monto pagado (${tx.amount_in_cents}) no coincide`);
        return payment;
      }
      const approved = tx.status === 'APPROVED';
      const result = await this.prisma.planPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          transactionId: tx.id,
          paymentMethod: tx.payment_method_type ?? null,
          failureReason: approved ? null : tx.status_message || `Pago ${tx.status.toLowerCase()} en Wompi`,
        },
      });
      if (result.count) {
        await this.events.publish(approved ? 'billing.plan.paid' : 'billing.plan.rejected', {
          paymentId: payment.id, memberId: payment.memberId, planId: payment.planId, planCode: payment.planCode, amount: payment.amount, transactionId: tx.id,
        });
      }
    }
    let current = await this.prisma.planPayment.findUniqueOrThrow({ where: { id: payment.id } });
    if (current.status === 'APPROVED' && !current.activated) {
      if (await this.membership.activate(current.memberId, current.planId, current.id)) {
        current = await this.prisma.planPayment.update({ where: { id: current.id }, data: { activated: true } });
        this.logger.log(`[plan_payment=${current.id}] plan ${current.planCode} activado`);
      }
    }
    return current;
  }

  mine(memberId: string) {
    return this.prisma.planPayment.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  all() {
    return this.prisma.planPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  static badGateway() {
    return new BadGatewayException('No pudimos consultar el pago en Wompi. Intenta de nuevo.');
  }
}
