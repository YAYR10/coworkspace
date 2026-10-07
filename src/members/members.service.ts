import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, ChangeRoleDto, UpdateProfileDto } from './members.dto';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  country: true,
  city: true,
  createdAt: true,
} as const;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: { ...PUBLIC_FIELDS, subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } } },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    return member;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const data = Object.fromEntries(Object.entries(dto).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    await this.prisma.member.update({ where: { id }, data });
    return this.me(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    if (!(await bcrypt.compare(dto.currentPassword, member.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('La nueva contraseña debe ser distinta');
    await this.prisma.member.update({ where: { id }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) } });
    // Cierra las demás sesiones abiertas
    await this.prisma.refreshToken.updateMany({ where: { memberId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async contact(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { name: true, email: true } });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    return member;
  }

  /** Listado para el administrador, con búsqueda por nombre/correo y filtro por rol. */
  list(query: { q?: string; role?: string }) {
    const q = query.q?.trim();
    return this.prisma.member.findMany({
      where: {
        role: query.role ? (query.role as any) : undefined,
        OR: q
          ? [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }]
          : undefined,
      },
      select: { ...PUBLIC_FIELDS, subscriptions: { where: { status: 'ACTIVE' }, select: { plan: { select: { name: true } } } } },
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  /**
   * Cambio de rol (solo ADMIN). Reglas:
   *  - Un administrador no puede cambiar su propio rol (evita quedarse sin acceso).
   *  - Siempre debe quedar al menos un administrador.
   */
  async changeRole(actor: AuthUser, memberId: string, dto: ChangeRoleDto) {
    if (actor.id === memberId) throw new BadRequestException('No puedes cambiar tu propio rol');
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    if (member.role === dto.role) return this.toPublic(member);
    if (member.role === 'ADMIN') {
      const admins = await this.prisma.member.count({ where: { role: 'ADMIN' } });
      if (admins <= 1) throw new ConflictException('Debe quedar al menos un administrador');
    }
    const updated = await this.prisma.member.update({ where: { id: memberId }, data: { role: dto.role } });
    return this.toPublic(updated);
  }

  private toPublic(m: { id: string; name: string; email: string; role: string; phone: string | null; country: string | null; city: string | null; createdAt: Date }) {
    return { id: m.id, name: m.name, email: m.email, role: m.role, phone: m.phone, country: m.country, city: m.city, createdAt: m.createdAt };
  }
}
