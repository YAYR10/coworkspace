import { Injectable, Logger } from '@nestjs/common';

const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

export interface PlanInfo { id: string; code: string; name: string; price: number }

/** Llamadas REST a Membership (con la clave interna): datos del plan y activación después del pago. */
@Injectable()
export class MembershipClient {
  private readonly logger = new Logger(MembershipClient.name);
  private readonly base = normalizeUrl(
    process.env.MEMBERSHIP_SERVICE_URL?.trim() || (process.env.RENDER ? 'https://coworkspace-membership.onrender.com' : 'http://localhost:3001'),
  );
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '', 'Content-Type': 'application/json' };
  private readonly timeout = () => AbortSignal.timeout(Number(process.env.MEMBERSHIP_TIMEOUT_MS ?? 60000));

  async plan(planId: string): Promise<PlanInfo | null> {
    const res = await fetch(`${this.base}/plans`, { headers: this.headers, signal: this.timeout() });
    if (!res.ok) throw new Error(`Membership respondió ${res.status}`);
    const plans = (await res.json()) as PlanInfo[];
    return plans.find((p) => p.id === planId) ?? null;
  }

  /** true si la membresía quedó activa (o ya lo estaba). */
  async activate(memberId: string, planId: string, paymentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/subscriptions/internal/activate`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ memberId, planId, paymentId }),
        signal: this.timeout(),
      });
      await res.text().catch(() => undefined);
      if (res.ok || res.status === 409) return true;
      this.logger.warn(`Membership no activó el plan (${res.status})`);
      return false;
    } catch (err) {
      this.logger.warn(`Membership no respondió al activar el plan: ${err.message}`);
      return false;
    }
  }
}
