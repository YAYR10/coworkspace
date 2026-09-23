import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface PaymentResult {
  approved: boolean;
  transactionId?: string;
  reason?: string;
}

/**
 * Pasarela de pagos SIMULADA (reemplazable por Wompi, PayU, Stripe...).
 * Reglas para poder demostrar la compensación de la saga:
 *  - Cargos adicionales mayores a EXTRA_CHARGE_APPROVAL_LIMIT se rechazan.
 *  - PAYMENT_FORCE_REJECT=true rechaza todo.
 */
@Injectable()
export class PaymentGatewayService {
  async charge(memberId: string, amount: number, kind: 'SUBSCRIPTION' | 'EXTRA'): Promise<PaymentResult> {
    if (process.env.PAYMENT_FORCE_REJECT === 'true') return { approved: false, reason: 'Pago rechazado por la entidad financiera' };
    const limit = Number(process.env.EXTRA_CHARGE_APPROVAL_LIMIT ?? 200000);
    if (kind === 'EXTRA' && amount > limit) {
      return { approved: false, reason: `Cupo insuficiente: el cargo de ${amount} supera el límite de ${limit}` };
    }
    return { approved: true, transactionId: `TX-${randomUUID().slice(0, 8).toUpperCase()}-${memberId.slice(0, 4)}` };
  }
}
