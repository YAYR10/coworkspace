import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { MembershipClient } from '../clients/membership.client';
import { AuthUser, isStaff } from '../common/current-user';
import { DomainEvent, EventStream } from '../events/event-stream.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildToken, hashSecret, newSecret, parseToken, sameHash } from './token';

const QR_TTL_SECONDS = () => Number(process.env.ACCESS_QR_TTL_SECONDS ?? 120);
const NFC_TTL_DAYS = () => Number(process.env.ACCESS_NFC_TTL_DAYS ?? 30);

export interface ValidationResult {
  granted: boolean;
  reason: string;
  memberId: string | null;
  memberEmail: string | null;
  latencyMs: number;
}

const REASONS: Record<string, string> = {
  GRANTED: 'Acceso concedido',
  MALFORMED: 'Código no reconocido',
  NOT_FOUND: 'Credencial inexistente',
  BAD_SECRET: 'Credencial falsificada',
  REVOKED: 'Credencial revocada',
  EXPIRED: 'Credencial vencida: genera un código nuevo',
  NO_MEMBERSHIP: 'Sin membresía vigente',
};

@Injectable()
export class AccessService implements OnModuleInit {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stream: EventStream,
    private readonly membership: MembershipClient,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    await this.stream.start((event) => this.handle(event));
    this.logger.log('Escuchando membership.activated / membership.expired');
  }

  /** Mantiene la proyección local del estado de membresía y revoca credenciales al vencer. */
  async handle(event: DomainEvent): Promise<void> {
    const d = event.data ?? {};
    if (!d.memberId) return;
    if (event.type === 'membership.activated') {
      await this.prisma.memberAccess.upsert({
        where: { memberId: d.memberId },
        create: { memberId: d.memberId, active: true, planCode: d.planCode, renewsAt: d.renewsAt ? new Date(d.renewsAt) : null },
        update: { active: true, planCode: d.planCode, renewsAt: d.renewsAt ? new Date(d.renewsAt) : null },
      });
    } else if (event.type === 'membership.expired') {
      await this.prisma.memberAccess.upsert({
        where: { memberId: d.memberId },
        create: { memberId: d.memberId, active: false, planCode: d.planCode },
        update: { active: false },
      });
      const { count } = await this.prisma.accessCredential.updateMany({
        where: { memberId: d.memberId, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedReason: 'membership.expired' },
      });
      this.logger.log(`Membresía vencida de ${d.memberId}: ${count} credenciales revocadas`);
    }
  }

  /**
   * ¿El miembro tiene membresía vigente? Primero la proyección local (milisegundos);
   * si no hay dato o está por vencer, se consulta a Membership por REST y se actualiza.
   */
  async hasActiveMembership(memberId: string): Promise<boolean | undefined> {
    const local = await this.prisma.memberAccess.findUnique({ where: { memberId } });
    if (local && (!local.active || !local.renewsAt || local.renewsAt > new Date())) return local.active;
    const sub = await this.membership.activeSubscription(memberId);
    if (sub === undefined) return local?.active;
    const active = !!sub && sub.status === 'ACTIVE';
    await this.prisma.memberAccess.upsert({
      where: { memberId },
      create: { memberId, active, planCode: sub?.plan?.code, renewsAt: sub ? new Date(sub.renewsAt) : null },
      update: { active, planCode: sub?.plan?.code ?? null, renewsAt: sub ? new Date(sub.renewsAt) : null },
    });
    return active;
  }

  /** Emite una credencial nueva. El token completo solo se devuelve aquí, una única vez. */
  async issue(user: AuthUser, kind: 'QR' | 'NFC' = 'QR', memberId?: string) {
    const target = memberId && memberId !== user.id ? memberId : user.id;
    if (target !== user.id && !isStaff(user)) throw new ForbiddenException('Solo el personal emite credenciales para otros miembros');
    const active = await this.hasActiveMembership(target);
    if (active === undefined) throw new ServiceUnavailableException('No se pudo verificar la membresía, intenta de nuevo');
    if (!active) throw new ForbiddenException('Necesitas una membresía vigente para tener credencial de acceso');

    const secret = newSecret();
    const expiresAt = kind === 'QR' ? new Date(Date.now() + QR_TTL_SECONDS() * 1000) : new Date(Date.now() + NFC_TTL_DAYS() * 86400000);
    const [, credential] = await this.prisma.$transaction([
      // Solo un QR vivo por miembro: el anterior deja de servir al generar uno nuevo
      this.prisma.accessCredential.updateMany({
        where: { memberId: target, kind, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedReason: 'replaced' },
      }),
      this.prisma.accessCredential.create({
        data: { memberId: target, memberEmail: target === user.id ? user.email : null, kind, credentialHash: hashSecret(secret), expiresAt },
      }),
    ]);
    return {
      id: credential.id,
      kind,
      token: buildToken(credential.id, secret),
      issuedAt: credential.issuedAt,
      expiresAt,
      ttlSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  mine(memberId: string) {
    return this.prisma.accessCredential.findMany({
      where: { memberId },
      select: { id: true, kind: true, isActive: true, issuedAt: true, expiresAt: true, revokedAt: true, revokedReason: true },
      orderBy: { issuedAt: 'desc' },
      take: 20,
    });
  }

  async revoke(user: AuthUser, id: string) {
    const credential = await this.prisma.accessCredential.findUnique({ where: { id } });
    if (!credential || (credential.memberId !== user.id && !isStaff(user))) throw new NotFoundException('Credencial no encontrada');
    await this.prisma.accessCredential.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date(), revokedReason: credential.memberId === user.id ? 'revoked.by.member' : 'revoked.by.staff' },
    });
    return { id, isActive: false };
  }

  /** Validación en la puerta: búsqueda por llave primaria + hash + proyección local. */
  async validate(token: string, locationId: string): Promise<ValidationResult> {
    const started = process.hrtime.bigint();
    let code = 'GRANTED';
    let memberId: string | null = null;
    let memberEmail: string | null = null;
    let credentialId: string | null = null;

    const parsed = parseToken(token);
    if (!parsed) code = 'MALFORMED';
    const credential = parsed
      ? await this.prisma.accessCredential.findUnique({ where: { id: parsed.credentialId } }).catch(() => null)
      : null;
    if (parsed && !credential) code = 'NOT_FOUND';
    if (credential && parsed) {
      credentialId = credential.id;
      memberId = credential.memberId;
      memberEmail = credential.memberEmail;
      if (!sameHash(credential.credentialHash, hashSecret(parsed.secret))) code = 'BAD_SECRET';
      else if (!credential.isActive) code = 'REVOKED';
      else if (credential.expiresAt <= new Date()) code = 'EXPIRED';
      else if ((await this.hasActiveMembership(credential.memberId)) !== true) code = 'NO_MEMBERSHIP';
    }

    const latencyMs = Number((process.hrtime.bigint() - started) / 1000000n);
    const granted = code === 'GRANTED';
    await this.prisma.accessLog.create({
      data: { memberId, locationId, credentialId: code === 'BAD_SECRET' ? null : credentialId, granted, reason: code, latencyMs },
    });
    this.logger.log(`[${granted ? 'CONCEDIDO' : 'DENEGADO'}] sede=${locationId} miembro=${memberId ?? '-'} motivo=${code} ${latencyMs}ms`);
    return { granted, reason: REASONS[code], memberId, memberEmail, latencyMs };
  }

  logs(filter: { locationId?: string; memberId?: string; take?: number }) {
    return this.prisma.accessLog.findMany({
      where: { locationId: filter.locationId || undefined, memberId: filter.memberId || undefined },
      orderBy: { timestamp: 'desc' },
      take: Math.min(filter.take ?? 100, 500),
    });
  }

  async stats(locationId?: string) {
    const since = new Date(Date.now() - 86400000);
    const where = { timestamp: { gte: since }, locationId: locationId || undefined };
    const [granted, denied, avg] = await Promise.all([
      this.prisma.accessLog.count({ where: { ...where, granted: true } }),
      this.prisma.accessLog.count({ where: { ...where, granted: false } }),
      this.prisma.accessLog.aggregate({ where, _avg: { latencyMs: true } }),
    ]);
    return { last24h: { granted, denied, avgLatencyMs: Math.round(avg._avg.latencyMs ?? 0) } };
  }
}
