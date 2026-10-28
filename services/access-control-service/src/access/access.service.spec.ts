import { ForbiddenException } from '@nestjs/common';
import { AccessService } from './access.service';
import { buildToken, hashSecret, parseToken } from './token';

describe('AccessService', () => {
  let prisma: any;
  let membership: any;
  let service: AccessService;
  const user = { id: 'm-1', role: 'MEMBER' as const, email: 'ana@demo.co' };
  const future = new Date(Date.now() + 3600000);

  beforeEach(() => {
    prisma = {
      memberAccess: { findUnique: jest.fn(), upsert: jest.fn() },
      accessCredential: {
        findUnique: jest.fn(),
        create: jest.fn(({ data }: any) => ({ id: 'c-1', issuedAt: new Date(), ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        update: jest.fn(),
      },
      accessLog: { create: jest.fn() },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    membership = { activeSubscription: jest.fn() };
    service = new AccessService(prisma, { start: jest.fn() } as any, membership);
  });

  it('emite un QR de corta duración y guarda solo el hash del secreto', async () => {
    prisma.memberAccess.findUnique.mockResolvedValue({ memberId: 'm-1', active: true, renewsAt: future });
    const res = await service.issue(user, 'QR');
    const parsed = parseToken(res.token)!;
    expect(parsed.credentialId).toBe('c-1');
    const data = prisma.accessCredential.create.mock.calls[0][0].data;
    expect(data.credentialHash).toBe(hashSecret(parsed.secret));
    expect(data).not.toHaveProperty('secret');
    expect(res.ttlSeconds).toBeLessThanOrEqual(120);
  });

  it('no emite credencial sin membresía vigente (consulta REST a Membership)', async () => {
    prisma.memberAccess.findUnique.mockResolvedValue(null);
    membership.activeSubscription.mockResolvedValue(null);
    await expect(service.issue(user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.memberAccess.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ active: false }) }));
  });

  it('concede el acceso con un token válido y lo registra en la bitácora', async () => {
    prisma.accessCredential.findUnique.mockResolvedValue({
      id: 'c-1', memberId: 'm-1', memberEmail: 'ana@demo.co', credentialHash: hashSecret('s3cr3t'), isActive: true, expiresAt: future,
    });
    prisma.memberAccess.findUnique.mockResolvedValue({ memberId: 'm-1', active: true, renewsAt: future });
    const res = await service.validate(buildToken('c-1', 's3cr3t'), 'loc-1');
    expect(res.granted).toBe(true);
    expect(prisma.accessLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ granted: true, reason: 'GRANTED', locationId: 'loc-1' }) });
  });

  it('rechaza un secreto falsificado, una credencial vencida y una revocada', async () => {
    const base = { id: 'c-1', memberId: 'm-1', credentialHash: hashSecret('bueno'), isActive: true, expiresAt: future };
    prisma.memberAccess.findUnique.mockResolvedValue({ memberId: 'm-1', active: true, renewsAt: future });
    prisma.accessCredential.findUnique.mockResolvedValueOnce(base);
    expect((await service.validate(buildToken('c-1', 'malo'), 'loc-1')).granted).toBe(false);
    prisma.accessCredential.findUnique.mockResolvedValueOnce({ ...base, expiresAt: new Date(Date.now() - 1000) });
    expect((await service.validate(buildToken('c-1', 'bueno'), 'loc-1')).reason).toMatch(/vencida/);
    prisma.accessCredential.findUnique.mockResolvedValueOnce({ ...base, isActive: false });
    expect((await service.validate(buildToken('c-1', 'bueno'), 'loc-1')).reason).toMatch(/revocada/);
    expect((await service.validate('cualquier-cosa', 'loc-1')).granted).toBe(false);
  });

  it('niega el acceso si la membresía ya no está vigente', async () => {
    prisma.accessCredential.findUnique.mockResolvedValue({ id: 'c-1', memberId: 'm-1', credentialHash: hashSecret('x'), isActive: true, expiresAt: future });
    prisma.memberAccess.findUnique.mockResolvedValue({ memberId: 'm-1', active: false });
    const res = await service.validate(buildToken('c-1', 'x'), 'loc-1');
    expect(res).toMatchObject({ granted: false, reason: 'Sin membresía vigente' });
  });

  it('revoca todas las credenciales al recibir membership.expired', async () => {
    await service.handle({ id: 'e-1', type: 'membership.expired', source: 'membership-service', occurredAt: '', data: { memberId: 'm-1' } });
    expect(prisma.accessCredential.updateMany).toHaveBeenCalledWith({
      where: { memberId: 'm-1', isActive: true },
      data: expect.objectContaining({ isActive: false, revokedReason: 'membership.expired' }),
    });
    expect(prisma.memberAccess.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { active: false } }));
  });
});
