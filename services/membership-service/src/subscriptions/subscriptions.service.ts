import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipPlan, Subscription } from '@prisma/client';
import { AuthUser } from '../common/current-user';
import { EventBus } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto } from './subscriptions.dto';

type SubscriptionWithPlan = Subscription & { plan: MembershipPlan };

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  private get cycleDays(): number {
    return Number(process.env.BILLING_CYCLE_DAYS ?? 30);
  }

  async subscribe(memberId: string, dto: SubscribeDto) {
    const plan = await this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    const active = await this.prisma.subscription.findFirst({ where: { memberId, status: 'ACTIVE' } });
    if (active) throw new ConflictException('Ya tienes una membresía activa');

    const now = new Date();
    const subscription = await this.prisma.subscription.create({
      data: { memberId, planId: plan.id, autoRenew: dto.autoRenew ?? true, startedAt: now, renewsAt: addDays(now, this.cycleDays) },
      include: { plan: true },
    });
    await this.publishActivated(subscription, now, false);
    return subscription;
  }

  findMine(memberId: string) {
    return this.prisma.subscription.findMany({ where: { memberId }, include: { plan: true }, orderBy: { startedAt: 'desc' } });
  }

  /** Consulta síncrona usada por otros servicios (p. ej. Access Control o Community). */
  async findActive(memberId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { memberId, status: 'ACTIVE' },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('El miembro no tiene membresía activa');
    return subscription;
  }

  /** El miembro desactiva la renovación: sigue activo hasta renewsAt y luego expira. */
  async cancelAutoRenew(user: AuthUser, id: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription || (subscription.memberId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    if (subscription.status !== 'ACTIVE') throw new ConflictException('La suscripción no está activa');
    return this.prisma.subscription.update({ where: { id }, data: { autoRenew: false }, include: { plan: true } });
  }

  /** Expiración inmediata (admin). Útil para demostrar el evento membership.expired. */
  async expireNow(id: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Suscripción no encontrada');
    if (subscription.status !== 'ACTIVE') throw new ConflictException('La suscripción no está activa');
    const expired = await this.prisma.subscription.update({ where: { id }, data: { status: 'EXPIRED' }, include: { plan: true } });
    await this.publishExpired(expired);
    return expired;
  }

  /** Renovación automática al final de cada ciclo de facturación. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processRenewals(): Promise<number> {
    const due = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', renewsAt: { lte: new Date() } },
      include: { plan: true },
    });
    for (const subscription of due) {
      if (subscription.autoRenew) {
        const renewed = await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { renewsAt: addDays(subscription.renewsAt, this.cycleDays) },
          include: { plan: true },
        });
        await this.publishActivated(renewed, subscription.renewsAt, true);
      } else {
        const expired = await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
          include: { plan: true },
        });
        await this.publishExpired(expired);
      }
    }
    if (due.length) this.logger.log(`Ciclo de renovación: ${due.length} suscripciones procesadas`);
    return due.length;
  }

  private publishActivated(s: SubscriptionWithPlan, periodStart: Date, isRenewal: boolean) {
    return this.events.publish('membership.activated', {
      subscriptionId: s.id,
      memberId: s.memberId,
      planId: s.planId,
      planCode: s.plan.code,
      planName: s.plan.name,
      price: s.plan.price,
      resourceAccess: s.plan.resourceAccess,
      periodStart: periodStart.toISOString(),
      renewsAt: s.renewsAt.toISOString(),
      isRenewal,
    });
  }

  private publishExpired(s: SubscriptionWithPlan) {
    return this.events.publish('membership.expired', {
      subscriptionId: s.id,
      memberId: s.memberId,
      planCode: s.plan.code,
      expiredAt: new Date().toISOString(),
    });
  }
}
