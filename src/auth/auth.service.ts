import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Member } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.member.findUnique({ where: { email } });
    if (exists) throw new ConflictException('El email ya está registrado');
    const member = await this.prisma.member.create({
      data: { name: dto.name, email, passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return this.issueTokens(member);
  }

  async login(dto: LoginDto) {
    const member = await this.prisma.member.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!member || !(await bcrypt.compare(dto.password, member.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueTokens(member);
  }

  /** Rotación de refresh tokens: cada uso revoca el token anterior. */
  async refresh(refreshToken: string) {
    const [id, secret] = refreshToken.split('.');
    if (!id || !secret) throw new UnauthorizedException('Refresh token inválido');
    const stored = await this.prisma.refreshToken.findUnique({ where: { id }, include: { member: true } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.tokenHash !== sha256(secret)) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.member);
  }

  async logout(refreshToken: string) {
    const [id] = refreshToken.split('.');
    await this.prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  private async issueTokens(member: Member) {
    const accessToken = await this.jwt.signAsync({
      sub: member.id,
      email: member.email,
      role: member.role,
      name: member.name,
    });
    const secret = randomBytes(32).toString('hex');
    const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
    const stored = await this.prisma.refreshToken.create({
      data: { memberId: member.id, tokenHash: sha256(secret), expiresAt: new Date(Date.now() + ttlDays * 86_400_000) },
    });
    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m',
      refreshToken: `${stored.id}.${secret}`,
      member: { id: member.id, name: member.name, email: member.email, role: member.role },
    };
  }
}
