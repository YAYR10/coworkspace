import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface WompiTransaction {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
  status_message?: string | null;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Pasarela de pagos Wompi (Bancolombia), en modo pruebas (sandbox) con llaves `*_test_*`.
 *  - Checkout web: el miembro paga en checkout.wompi.co y vuelve a /pago con el id de la transacción.
 *  - Confirmación doble: consulta de la transacción a la API y webhook firmado (eventos).
 * Variables: WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET, WOMPI_API_URL, PAYMENT_REDIRECT_URL.
 */
@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);

  get enabled(): boolean {
    return !!process.env.WOMPI_PUBLIC_KEY && !!process.env.WOMPI_INTEGRITY_SECRET;
  }

  get sandbox(): boolean {
    return (process.env.WOMPI_PUBLIC_KEY ?? '').startsWith('pub_test_');
  }

  private get apiUrl(): string {
    const fallback = this.sandbox ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
    return (process.env.WOMPI_API_URL || fallback).replace(/\/$/, '');
  }

  /** Firma de integridad que exige el checkout: SHA256(referencia + monto en centavos + moneda + secreto). */
  integritySignature(reference: string, amountInCents: number, currency = 'COP', secret = process.env.WOMPI_INTEGRITY_SECRET ?? ''): string {
    return sha256(`${reference}${amountInCents}${currency}${secret}`);
  }

  checkoutUrl(reference: string, amountCop: number): string {
    const amountInCents = Math.round(amountCop * 100);
    const params = new URLSearchParams({
      'public-key': process.env.WOMPI_PUBLIC_KEY ?? '',
      currency: 'COP',
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': this.integritySignature(reference, amountInCents),
      'redirect-url': process.env.PAYMENT_REDIRECT_URL ?? 'https://coworkspace-web.onrender.com/pago',
    });
    return `https://checkout.wompi.co/p/?${params.toString()}`;
  }

  async getTransaction(id: string): Promise<WompiTransaction | null> {
    try {
      const res = await fetch(`${this.apiUrl}/transactions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        this.logger.warn(`Wompi respondió ${res.status} para la transacción ${id}`);
        return null;
      }
      const body = (await res.json()) as { data: WompiTransaction };
      return body.data;
    } catch (err) {
      this.logger.error(`No se pudo consultar Wompi: ${err.message}`);
      return null;
    }
  }

  /**
   * Valida el webhook: SHA256(valores de signature.properties + timestamp + secreto de eventos) === signature.checksum.
   */
  verifyEvent(event: any, secret = process.env.WOMPI_EVENTS_SECRET ?? ''): boolean {
    const props: string[] = event?.signature?.properties ?? [];
    const checksum: string = event?.signature?.checksum ?? '';
    if (!secret || !props.length || !checksum || event?.timestamp === undefined) return false;
    const values = props.map((path) => path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), event.data));
    const expected = sha256(`${values.join('')}${event.timestamp}${secret}`);
    return expected.toUpperCase() === checksum.toUpperCase();
  }
}
