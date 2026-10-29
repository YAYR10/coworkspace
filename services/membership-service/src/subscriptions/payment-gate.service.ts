import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

/**
 * Si Billing tiene la pasarela de pagos activa (Wompi), una membresía solo se activa después de pagar:
 * la suscripción directa se rechaza y el plan lo activa Billing al aprobarse el pago.
 * Sin pasarela configurada (demo), la suscripción directa sigue funcionando con cobro simulado.
 */
@Injectable()
export class PaymentGate {
  private readonly logger = new Logger(PaymentGate.name);
  private readonly base = normalizeUrl(
    process.env.BILLING_SERVICE_URL?.trim() || (process.env.RENDER ? 'https://coworkspace-billing.onrender.com' : 'http://localhost:3004'),
  );
  private cache?: { provider: string; at: number };

  async provider(): Promise<string> {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.provider;
    const res = await fetch(`${this.base}/payments/status`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      signal: AbortSignal.timeout(Number(process.env.BILLING_TIMEOUT_MS ?? 60000)),
    });
    if (!res.ok) throw new Error(`Billing respondió ${res.status}`);
    const { provider } = (await res.json()) as { provider: string };
    this.cache = { provider, at: Date.now() };
    return provider;
  }

  async assertDirectSubscriptionAllowed(): Promise<void> {
    let provider: string;
    try {
      provider = await this.provider();
    } catch (err) {
      this.logger.warn(`No se pudo consultar la pasarela: ${err.message}`);
      throw new ServiceUnavailableException('No pudimos verificar el medio de pago, intenta de nuevo en un momento');
    }
    if (provider !== 'simulado') {
      throw new HttpException('Para activar el plan primero debes pagarlo en la pasarela de pagos', HttpStatus.PAYMENT_REQUIRED);
    }
  }
}
