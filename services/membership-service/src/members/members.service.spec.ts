import { BadRequestException, ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';

describe('MembersService.changeRole', () => {
  const admin = { id: 'admin-1', role: 'ADMIN' as const };
  let prisma: any;
  let service: MembersService;

  beforeEach(() => {
    prisma = { member: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() } };
    service = new MembersService(prisma);
  });

  const member = (role: string, id = 'u-1') => ({ id, name: 'Ana', email: 'a@b.co', role, phone: null, country: null, city: null, createdAt: new Date(), passwordHash: 'x' });

  it('el administrador puede convertir a un miembro en coordinador', async () => {
    prisma.member.findUnique.mockResolvedValue(member('MEMBER'));
    prisma.member.update.mockResolvedValue(member('COORDINATOR'));
    const result = await service.changeRole(admin, 'u-1', { role: 'COORDINATOR' });
    expect(result.role).toBe('COORDINATOR');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('no permite que el administrador cambie su propio rol', async () => {
    await expect(service.changeRole(admin, 'admin-1', { role: 'MEMBER' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite dejar el sistema sin administradores', async () => {
    prisma.member.findUnique.mockResolvedValue(member('ADMIN', 'admin-2'));
    prisma.member.count.mockResolvedValue(1);
    await expect(service.changeRole(admin, 'admin-2', { role: 'MEMBER' })).rejects.toBeInstanceOf(ConflictException);
  });
});
