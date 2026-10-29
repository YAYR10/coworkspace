import { createHash } from 'crypto';
import { BillingService } from './billing.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { WompiService } from './wompi.service';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

describe('WompiService', () => {
  const wompi = new WompiService();

  it('firma de integridad según la documentación de Wompi', () => {
    // Ejemplo de la documentación: referencia + centavos + moneda + secreto
    expect(wompi.integritySignature('sk8-438k4-xmxm392-sn2m', 2490000, 'COP', 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6')).toBe(
      sha('sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6'),
    );
  });

  it('valida la firma del webhook y rechaza una alterada', () => {
    const event: any = {
      event: 'transaction.updated',
      data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
      timestamp: 1530291411,
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] },
    };
    event.signature.checksum = sha('1234-1610641025-49201APPROVED44900001530291411test_events_secreto');
    expect(wompi.verifyEvent(event, 'test_events_secreto')).toBe(true);
    event.data.transaction.status = 'DECLINED';
    expect(wompi.verifyEvent(event, 'test_events_secreto')).toBe(false);
  });
});

describe('BillingService con Wompi', () => {
  let prisma: any;
  let events: any;
  let service: BillingService;
  const charge = { id: 'ch-1', memberId: 'm-1', bookingId: 'b-1', amount: 100000, status: 'PENDING' };

  beforeEach(() => {
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_abc';
    process.env.WOMPI_INTEGRITY_SECRET = 'test_integrity_xyz';
    prisma = {
      memberPlan: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE', resourceAccess: ['DESK'], planCode: 'FLEX_DESK' }) },
      extraCharge: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }: any) => ({ id: 'ch-1', ...data })),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...charge, status: 'APPROVED' }),
      },
    };
    events = { publish: jest.fn(), subscribe: jest.fn() };
    service = new BillingService(prisma, events, new PaymentGatewayService(), new WompiService(), {} as any);
  });
  afterEach(() => {
    delete process.env.WOMPI_PUBLIC_KEY;
    delete process.env.WOMPI_INTEGRITY_SECRET;
  });

  it('deja el cobro PENDIENTE y no responde a la saga hasta que se pague', async () => {
    await service.onBookingCreated({ bookingId: 'b-1', memberId: 'm-1', resourceType: 'ROOM', hours: 2 });
    expect(prisma.extraCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 100000, status: 'PENDING' }) });
    expect(events.publish).not.toHaveBeenCalledWith('billing.charge.approved', expect.anything());
  });

  it('genera el enlace de checkout firmado', async () => {
    prisma.extraCharge.findUnique.mockResolvedValue(charge);
    const out = await service.checkout({ id: 'm-1', role: 'MEMBER' }, 'b-1');
    const url = new URL(out.checkoutUrl);
    expect(url.host).toBe('checkout.wompi.co');
    expect(url.searchParams.get('amount-in-cents')).toBe('10000000');
    expect(url.searchParams.get('signature:integrity')).toBe(sha(`${out.reference}10000000COPtest_integrity_xyz`));
  });

  it('pago aprobado -> billing.charge.approved (la reserva se confirma)', async () => {
    await service.settle(charge as any, { id: 'tx-1', status: 'APPROVED', reference: 'ch-1.k1', amount_in_cents: 10000000, currency: 'COP' });
    expect(events.publish).toHaveBeenCalledWith('billing.charge.approved', expect.objectContaining({ bookingId: 'b-1', transactionId: 'tx-1' }));
  });

  it('pago rechazado -> billing.charge.rejected (compensación)', async () => {
    prisma.extraCharge.findUniqueOrThrow.mockResolvedValue({ ...charge, status: 'REJECTED', failureReason: 'Fondos insuficientes' });
    await service.settle(charge as any, { id: 'tx-2', status: 'DECLINED', reference: 'ch-1.k1', amount_in_cents: 10000000, currency: 'COP', status_message: 'Fondos insuficientes' });
    expect(events.publish).toHaveBeenCalledWith('billing.charge.rejected', expect.objectContaining({ bookingId: 'b-1' }));
  });

  it('ignora un pago con monto distinto', async () => {
    await service.settle(charge as any, { id: 'tx-3', status: 'APPROVED', reference: 'ch-1.k1', amount_in_cents: 100, currency: 'COP' });
    expect(prisma.extraCharge.updateMany).not.toHaveBeenCalled();
  });

  it('un miembro no puede pagar el cobro de otro', async () => {
    prisma.extraCharge.findUnique.mockResolvedValue(charge);
    await expect(service.checkout({ id: 'otro', role: 'MEMBER' }, 'b-1')).rejects.toThrow('Cobro no encontrado');
  });
});
