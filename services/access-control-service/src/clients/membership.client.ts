import { Injectable, Logger } from '@nestjs/common';

const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

export function membershipUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env.MEMBERSHIP_SERVICE_URL?.trim()) return normalizeUrl(env.MEMBERSHIP_SERVICE_URL.trim());
  return env.RENDER ? 'https://coworkspace-membership.onrender.com' : 'http://localhost:3001';
}

export interface ActiveSubscription {
  status: string;
  renewsAt: string;
  plan: { code: string };
}

/** Consulta síncrona (REST) a Membership: ¿el miembro tiene una membresía vigente? */
@Injectable()
export class MembershipClient {
  private readonly logger = new Logger(MembershipClient.name);
  private readonly base = membershipUrl();

  /** undefined = Membership no respondió (no se puede decidir); null = sin membresía vigente. */
  async activeSubscription(memberId: string): Promise<ActiveSubscription | null | undefined> {
    try {
      const res = await fetch(`${this.base}/subscriptions/member/${memberId}/active`, {
        headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
        signal: AbortSignal.timeout(Number(process.env.MEMBERSHIP_TIMEOUT_MS ?? 45000)),
      });
      if (res.status === 404) return null;
      if (!res.ok) return undefined;
      return (await res.json()) as ActiveSubscription;
    } catch (err) {
      this.logger.warn(`Membership no respondió: ${err.message}`);
      return undefined;
    }
  }
}
