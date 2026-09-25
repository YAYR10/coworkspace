import { ConflictException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

const plan = { id: 'p-1', code: 'FLEX_DESK', name: 'Puesto flexible', price: 350000, resourceAccess: ['DESK'] };

describe('SubscriptionsService', () => {
  let prisma: any;
  let events: any;
  let service: SubscriptionsService;

  beforeEach(() => {
    events = { publish: jest.fn() };
    prisma = {
      membershipPlan: { findUnique: jest.fn().mockResolvedValue(plan) },
      subscription: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    };
    service = new SubscriptionsService(prisma, events);
  });

  it('crea la suscripción y publica membership.activated', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.subscription.create.mockImplementation(({ data }: any) => ({ id: 's-1', ...data, plan }));

    await service.subscribe('m-1', { planId: 'p-1' });

    expect(events.publish).toHaveBeenCalledWith(
      'membership.activated',
      expect.objectContaining({ memberId: 'm-1', planCode: 'FLEX_DESK', price: 350000, isRenewal: false }),
    );
  });

  it('no permite dos membresías activas', async () => {
    prisma.subscription.findFirst.mockResolvedValue({ id: 's-0' });
    await expect(service.subscribe('m-1', { planId: 'p-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('renueva las suscripciones con autoRenew y expira las demás', async () => {
    const past = new Date(Date.now() - 1000);
    prisma.subscription.findMany.mockResolvedValue([
      { id: 's-1', memberId: 'm-1', planId: 'p-1', autoRenew: true, renewsAt: past, plan },
      { id: 's-2', memberId: 'm-2', planId: 'p-1', autoRenew: false, renewsAt: past, plan },
    ]);
    prisma.subscription.update.mockImplementation(({ where, data }: any) => ({
      id: where.id,
      memberId: where.id === 's-1' ? 'm-1' : 'm-2',
      planId: 'p-1',
      renewsAt: data.renewsAt ?? past,
      plan,
    }));

    const processed = await service.processRenewals();

    expect(processed).toBe(2);
    expect(events.publish).toHaveBeenCalledWith('membership.activated', expect.objectContaining({ subscriptionId: 's-1', isRenewal: true }));
    expect(events.publish).toHaveBeenCalledWith('membership.expired', expect.objectContaining({ subscriptionId: 's-2' }));
  });
});
