import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthUser, isStaff } from '../common/current-user';
import { MembershipClient } from './membership.client';

const TTL_MS = () => Number(process.env.MEMBERSHIP_CACHE_SECONDS ?? 60) * 1000;

/**
 * Antes de cada operación de comunidad se consulta a Membership (REST síncrono) si el
 * miembro tiene acceso. La respuesta se guarda 60 s en memoria para no llamar en cada clic.
 */
@Injectable()
export class MembershipGate {
  private readonly cache = new Map<string, { active: boolean; at: number }>();

  constructor(private readonly membership: MembershipClient) {}

  async assertMember(user: AuthUser): Promise<void> {
    if (isStaff(user)) return;
    const hit = this.cache.get(user.id);
    let active = hit && Date.now() - hit.at < TTL_MS() ? hit.active : undefined;
    if (active === undefined) {
      const sub = await this.membership.activeSubscription(user.id);
      if (sub === undefined) throw new ServiceUnavailableException('No se pudo verificar tu membresía, intenta de nuevo');
      active = !!sub && sub.status === 'ACTIVE';
      this.cache.set(user.id, { active, at: Date.now() });
    }
    if (!active) throw new ForbiddenException('La comunidad es exclusiva para miembros con membresía vigente');
  }

  forget(memberId: string) {
    this.cache.delete(memberId);
  }
}
