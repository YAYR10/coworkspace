import { HttpException } from '@nestjs/common';
import { PaymentGate } from './payment-gate.service';

describe('PaymentGate', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  const mockProvider = (provider: string) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ provider }) }) as any;
  };

  it('con pasarela simulada permite la suscripción directa', async () => {
    mockProvider('simulado');
    await expect(new PaymentGate().assertDirectSubscriptionAllowed()).resolves.toBeUndefined();
  });

  it('con Wompi activo exige pagar primero (402)', async () => {
    mockProvider('wompi');
    const err = await new PaymentGate().assertDirectSubscriptionAllowed().catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(402);
  });

  it('si Billing no responde, no deja saltarse el pago (503)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as any;
    const err = await new PaymentGate().assertDirectSubscriptionAllowed().catch((e) => e);
    expect(err.getStatus()).toBe(503);
  });
});
