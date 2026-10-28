import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipGate } from '../clients/membership-gate.service';
import { AuthUser, isStaff } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { EventDto, MessageDto, ProfileDto } from './community.dto';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gate: MembershipGate,
  ) {}

  // ---------- Directorio ----------

  async directory(user: AuthUser, q?: string, locationId?: string, skill?: string) {
    await this.gate.assertMember(user);
    const text = q?.trim();
    return this.prisma.memberProfile.findMany({
      where: {
        visible: true,
        locationId: locationId || undefined,
        skills: skill ? { has: skill } : undefined,
        OR: text
          ? [
              { displayName: { contains: text, mode: 'insensitive' } },
              { headline: { contains: text, mode: 'insensitive' } },
              { company: { contains: text, mode: 'insensitive' } },
              { bio: { contains: text, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async profile(user: AuthUser, memberId: string) {
    await this.gate.assertMember(user);
    const p = await this.prisma.memberProfile.findUnique({ where: { memberId } });
    if (!p || (!p.visible && p.memberId !== user.id && !isStaff(user))) throw new NotFoundException('Perfil no encontrado');
    return p;
  }

  myProfile(user: AuthUser) {
    return this.prisma.memberProfile.findUnique({ where: { memberId: user.id } });
  }

  async saveProfile(user: AuthUser, dto: ProfileDto) {
    await this.gate.assertMember(user);
    const data = { ...dto, skills: (dto.skills ?? []).map((s) => s.trim()).filter(Boolean) };
    return this.prisma.memberProfile.upsert({ where: { memberId: user.id }, create: { memberId: user.id, ...data }, update: data });
  }

  // ---------- Eventos de networking ----------

  /** Público: la página de cada sede muestra sus próximos eventos. */
  async events(locationId?: string, user?: AuthUser | null) {
    const events = await this.prisma.communityEvent.findMany({
      where: { locationId: locationId || undefined, cancelled: false, scheduledAt: { gte: new Date(Date.now() - 3 * 3600000) } },
      include: { _count: { select: { attendees: true } }, attendees: user ? { where: { memberId: user.id }, select: { memberId: true } } : false },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
    return events.map(({ _count, attendees, ...e }) => ({
      ...e,
      attendeeCount: _count.attendees,
      spotsLeft: Math.max(0, e.capacity - _count.attendees),
      attending: Array.isArray(attendees) && attendees.length > 0,
    }));
  }

  createEvent(user: AuthUser, dto: EventDto) {
    if (new Date(dto.scheduledAt) <= new Date()) throw new BadRequestException('El evento debe ser en el futuro');
    return this.prisma.communityEvent.create({ data: { ...dto, scheduledAt: new Date(dto.scheduledAt), createdBy: user.id } });
  }

  async cancelEvent(id: string) {
    await this.findEvent(id);
    return this.prisma.communityEvent.update({ where: { id }, data: { cancelled: true } });
  }

  async attend(user: AuthUser, id: string) {
    await this.gate.assertMember(user);
    const event = await this.findEvent(id);
    if (event.cancelled || event.scheduledAt <= new Date()) throw new BadRequestException('El evento ya no admite inscripciones');
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.eventAttendee.count({ where: { eventId: id } });
      if (count >= event.capacity) throw new ConflictException('El evento ya no tiene cupos');
      await tx.eventAttendee.upsert({ where: { eventId_memberId: { eventId: id, memberId: user.id } }, create: { eventId: id, memberId: user.id }, update: {} });
      return { eventId: id, attending: true };
    });
  }

  async leave(user: AuthUser, id: string) {
    await this.prisma.eventAttendee.deleteMany({ where: { eventId: id, memberId: user.id } });
    return { eventId: id, attending: false };
  }

  async attendees(id: string) {
    await this.findEvent(id);
    const rows = await this.prisma.eventAttendee.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' } });
    const profiles = await this.names(rows.map((r) => r.memberId));
    return rows.map((r) => ({ memberId: r.memberId, displayName: profiles.get(r.memberId) ?? 'Miembro', since: r.createdAt }));
  }

  private async findEvent(id: string) {
    const event = await this.prisma.communityEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  // ---------- Mensajería interna ----------

  async send(user: AuthUser, dto: MessageDto) {
    await this.gate.assertMember(user);
    if (dto.recipientId === user.id) throw new BadRequestException('No puedes enviarte mensajes a ti mismo');
    const recipient = await this.prisma.memberProfile.findUnique({ where: { memberId: dto.recipientId } });
    if (!recipient || (!recipient.visible && !isStaff(user))) throw new NotFoundException('Ese miembro no está en el directorio');
    return this.prisma.message.create({ data: { senderId: user.id, recipientId: dto.recipientId, body: dto.body.trim() } });
  }

  /** Bandeja: última conversación con cada miembro y cuántos mensajes sin leer. */
  async conversations(user: AuthUser) {
    await this.gate.assertMember(user);
    const recent = await this.prisma.message.findMany({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const threads = new Map<string, { memberId: string; lastMessage: string; lastAt: Date; unread: number }>();
    for (const m of recent) {
      const other = m.senderId === user.id ? m.recipientId : m.senderId;
      const t = threads.get(other) ?? { memberId: other, lastMessage: m.body, lastAt: m.createdAt, unread: 0 };
      if (m.recipientId === user.id && !m.readAt) t.unread += 1;
      threads.set(other, t);
    }
    const names = await this.names([...threads.keys()]);
    return [...threads.values()].map((t) => ({ ...t, displayName: names.get(t.memberId) ?? 'Miembro' }));
  }

  async thread(user: AuthUser, otherId: string) {
    await this.gate.assertMember(user);
    await this.prisma.message.updateMany({ where: { senderId: otherId, recipientId: user.id, readAt: null }, data: { readAt: new Date() } });
    return this.prisma.message.findMany({
      where: { OR: [{ senderId: user.id, recipientId: otherId }, { senderId: otherId, recipientId: user.id }] },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async unread(user: AuthUser) {
    return { unread: await this.prisma.message.count({ where: { recipientId: user.id, readAt: null } }) };
  }

  private async names(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const rows = await this.prisma.memberProfile.findMany({ where: { memberId: { in: ids } }, select: { memberId: true, displayName: true } });
    return new Map(rows.map((r) => [r.memberId, r.displayName]));
  }

  assertOwnerOrStaff(user: AuthUser, ownerId: string) {
    if (user.id !== ownerId && !isStaff(user)) throw new ForbiddenException();
  }
}
