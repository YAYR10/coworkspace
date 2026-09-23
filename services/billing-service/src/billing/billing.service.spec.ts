import { BillingService } from './billing.service';
import { PaymentGatewayService } from './payment-gateway.service';

describe('BillingService', () => {
  let prisma: any;
  let events: any;
  let service: BillingService;

  beforeEach(() => {
    delete process.env.PAYMENT_FORCE_REJECT;
    process.env.EXTRA_CHARGE_APPROVAL_LIMIT = '200000';
    process.env.EXTRA_ROOM_HOURLY_RATE = '50000';
    prisma = {
      memberPlan: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
      invoice: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(({ data }: any) => ({ id: 'inv-1', ...data })) },
      extraCharge: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(({ data }: any) => ({ id: 'ch-1', ...data })), updateMany: jest.fn() },
    };
    events = { publish: jest.fn(), subscribe: jest.fn() };
    service = new BillingService(prisma, events, new PaymentGatewayService());
  });

  it('aprueba sin cargo cuando el recurso está incluido en el plan', async () => {
    prisma.memberPlan.findUnique.mockResolvedValue({ status: 'ACTIVE', resourceAccess: ['DESK', 'ROOM'], planCode: 'PRIVATE_OFFICE' });
    await service.onBookingCreated({ bookingId: 'b-1', memberId: 'm-1', resourceType: 'ROOM', hours: 2 });
    expect(prisma.extraCharge.create).not.toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith('billing.charge.approved', expect.objectContaining({ amount: 0, covered: true }));
  });

  it('cobra cargo adicional cuando la sala está fuera del plan', async () => {
    prisma.memberPlan.findUnique.mockResolvedValue({ status: 'ACTIVE', resourceAccess: ['DESK'], planCode: 'FLEX_DESK' });
    await service.onBookingCreated({ bookingId: 'b-1', memberId: 'm-1', resourceType: 'ROOM', hours: 2 });
    expect(prisma.extraCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 100000, status: 'APPROVED' }) });
    expect(events.publish).toHaveBeenCalledWith('billing.charge.approved', expect.objectContaining({ amount: 100000 }));
  });

  it('rechaza el cargo que supera el cupo -> dispara la compensación en Booking', async () => {
    prisma.memberPlan.findUnique.mockResolvedValue({ status: 'ACTIVE', resourceAccess: ['DESK'], planCode: 'FLEX_DESK' });
    await service.onBookingCreated({ bookingId: 'b-1', memberId: 'm-1', resourceType: 'ROOM', hours: 5 });
    expect(prisma.extraCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 250000, status: 'REJECTED' }) });
    expect(events.publish).toHaveBeenCalledWith('billing.charge.rejected', expect.objectContaining({ bookingId: 'b-1' }));
  });

  it('genera factura electrónica al activarse una membresía (idempotente por periodo)', async () => {
    await service.onMembershipActivated({
      subscriptionId: 's-1', memberId: 'm-1', planCode: 'FLEX_DESK', planName: 'Puesto flexible', price: 350000,
      resourceAccess: ['DESK'], periodStart: '2026-09-01T00:00:00.000Z', renewsAt: '2026-10-01T00:00:00.000Z', isRenewal: false,
    });
    const data = prisma.invoice.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ period: '2026-09-01', amount: 350000, status: 'PAID' });
    expect(data.electronicNumber).toMatch(/^FE-/);
    expect(events.publish).toHaveBeenCalledWith('billing.invoice.paid', expect.any(Object));
  });

  it('anula el cargo adicional cuando se cancela la reserva', async () => {
    prisma.extraCharge.updateMany.mockResolvedValue({ count: 1 });
    await service.onBookingCancelled({ bookingId: 'b-1' });
    expect(prisma.extraCharge.updateMany).toHaveBeenCalledWith({ where: { bookingId: 'b-1', status: 'APPROVED' }, data: { status: 'VOIDED' } });
  });
});
