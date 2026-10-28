import { ConflictException } from '@nestjs/common';
import { PlanPaymentsService } from './plan-payments.service';
import { WompiService } from './wompi.service';

describe('PlanPaymentsService (pago de membresías con Wompi)', () => {
  let prisma: any;
  let membership: any;
  let events: any;
  let service: PlanPaymentsService;
  const user = { id: 'm-1', role: 'MEMBER' as const };
  const plan = { id: 'p-1', code: 'FLEX_DESK', name: 'Puesto flexible', price: 350000 };
  const pending = { id: 'pay-1', memberId: 'm-1', planId: 'p-1', planCode: 'FLEX_DESK', planName: 'Puesto flexible', amount: 350000, status: 'PENDING', activated: false };

  beforeEach(() => {
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_abc';
    process.env.WOMPI_INTEGRITY_SECRET = 'test_integrity_xyz';
    prisma = {
      planPayment: {
        create: jest.fn(({ data }: any) => ({ id: 'pay-1', ...data })),
        update: jest.fn(({ data }: any) => ({ ...pending, status: 'APPROVED', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(pending),
        findUniqueOrThrow: jest.fn(),
      },
    };
    membership = { plan: jest.fn().mockResolvedValue(plan), activate: jest.fn().mockResolvedValue(true) };
    events = { publish: jest.fn() };
    service = new PlanPaymentsService(prisma, new WompiService(), membership, events);
  });

  afterEach(() => {
    delete process.env.WOMPI_PUBLIC_KEY;
    delete process.env.WOMPI_INTEGRITY_SECRET;
  });

  it('crea el pago pendiente con el precio del plan y devuelve el checkout firmado', async () => {
    const res = await service.checkout(user, 'p-1');
    expect(prisma.planPayment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 350000, planCode: 'FLEX_DESK' }) });
    expect(res.reference).toMatch(/^plan_pay-1\./);
    const url = new URL(res.checkoutUrl);
    expect(url.searchParams.get('amount-in-cents')).toBe('35000000');
    expect(PlanPaymentsService.paymentIdOf(res.reference)).toBe('pay-1');
  });

  it('sin llaves de Wompi no hay checkout', async () => {
    delete process.env.WOMPI_PUBLIC_KEY;
    await expect(service.checkout(user, 'p-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('pago aprobado → activa el plan en Membership una sola vez', async () => {
    prisma.planPayment.findUniqueOrThrow.mockResolvedValue({ ...pending, status: 'APPROVED' });
    const res = await service.verify(user, { id: 'tx-1', status: 'APPROVED', reference: 'plan_pay-1.abc', amount_in_cents: 35000000, currency: 'COP' });
    expect(events.publish).toHaveBeenCalledWith('billing.plan.paid', expect.objectContaining({ paymentId: 'pay-1', planId: 'p-1' }));
    expect(membership.activate).toHaveBeenCalledWith('m-1', 'p-1', 'pay-1');
    expect(res).toMatchObject({ kind: 'plan', status: 'APPROVED', activated: true });
  });

  it('pago rechazado → no activa el plan', async () => {
    prisma.planPayment.findUniqueOrThrow.mockResolvedValue({ ...pending, status: 'REJECTED' });
    const res = await service.verify(user, { id: 'tx-2', status: 'DECLINED', reference: 'plan_pay-1.abc', amount_in_cents: 35000000, currency: 'COP' });
    expect(membership.activate).not.toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith('billing.plan.rejected', expect.any(Object));
    expect(res.status).toBe('REJECTED');
  });

  it('ignora un pago por un monto distinto al del plan', async () => {
    prisma.planPayment.findUniqueOrThrow.mockResolvedValue(pending);
    await service.verify(user, { id: 'tx-3', status: 'APPROVED', reference: 'plan_pay-1.abc', amount_in_cents: 100, currency: 'COP' });
    expect(prisma.planPayment.updateMany).not.toHaveBeenCalled();
    expect(membership.activate).not.toHaveBeenCalled();
  });
});
