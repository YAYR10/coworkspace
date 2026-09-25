import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  let prisma: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      member: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-1' }), findUnique: jest.fn(), update: jest.fn() },
    };
    service = new AuthService(prisma, jwt as any);
  });

  it('registra un miembro con la contraseña hasheada y emite tokens', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockImplementation(({ data }: any) => ({ id: 'm-1', role: 'MEMBER', ...data }));

    const result = await service.register({ name: 'Ana', email: 'ANA@mail.com', password: 'secreto123' });

    const saved = prisma.member.create.mock.calls[0][0].data;
    expect(saved.email).toBe('ana@mail.com');
    expect(await bcrypt.compare('secreto123', saved.passwordHash)).toBe(true);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken.startsWith('rt-1.')).toBe(true);
  });

  it('rechaza emails duplicados', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm-1' });
    await expect(service.register({ name: 'Ana', email: 'ana@mail.com', password: 'secreto123' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza credenciales inválidas', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm-1', passwordHash: await bcrypt.hash('otra-clave', 4) });
    await expect(service.login({ email: 'ana@mail.com', password: 'secreto123' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza refresh tokens revocados', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 1e6) });
    await expect(service.refresh('rt-1.abc')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
