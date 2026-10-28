import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipGate } from '../clients/membership-gate.service';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let prisma: any;
  let membership: any;
  let service: CommunityService;
  const ana = { id: '11111111-1111-4111-8111-111111111111', role: 'MEMBER' as const };
  const luis = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    prisma = {
      memberProfile: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), upsert: jest.fn() },
      communityEvent: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      eventAttendee: { count: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
      message: { create: jest.fn(({ data }: any) => data), findMany: jest.fn(), updateMany: jest.fn() },
    };
    prisma.$transaction = jest.fn((fn: any) => fn(prisma));
    membership = { activeSubscription: jest.fn().mockResolvedValue({ status: 'ACTIVE', renewsAt: '', plan: { code: 'FLEX' } }) };
    service = new CommunityService(prisma, new MembershipGate(membership));
  });

  it('consulta a Membership antes de mostrar el directorio y cachea la respuesta', async () => {
    await service.directory(ana, 'diseño');
    await service.directory(ana);
    expect(membership.activeSubscription).toHaveBeenCalledTimes(1);
    expect(prisma.memberProfile.findMany.mock.calls[0][0].where).toMatchObject({ visible: true });
  });

  it('bloquea la comunidad a quien no tiene membresía vigente', async () => {
    membership.activeSubscription.mockResolvedValue(null);
    await expect(service.directory(ana)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el personal entra sin consultar membresía', async () => {
    await service.directory({ id: 'adm', role: 'ADMIN' });
    expect(membership.activeSubscription).not.toHaveBeenCalled();
  });

  it('no deja inscribirse a un evento lleno', async () => {
    prisma.communityEvent.findUnique.mockResolvedValue({ id: 'e-1', capacity: 2, cancelled: false, scheduledAt: new Date(Date.now() + 86400000) });
    prisma.eventAttendee.count.mockResolvedValue(2);
    await expect(service.attend(ana, 'e-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('envía mensajes solo a miembros visibles del directorio', async () => {
    prisma.memberProfile.findUnique.mockResolvedValueOnce(null);
    await expect(service.send(ana, { recipientId: luis, body: 'hola' })).rejects.toBeInstanceOf(NotFoundException);
    prisma.memberProfile.findUnique.mockResolvedValueOnce({ memberId: luis, visible: true });
    const msg = await service.send(ana, { recipientId: luis, body: '  ¿Café?  ' });
    expect(msg).toEqual({ senderId: ana.id, recipientId: luis, body: '¿Café?' });
  });

  it('agrupa la bandeja por conversación y cuenta los no leídos', async () => {
    prisma.message.findMany.mockResolvedValue([
      { senderId: luis, recipientId: ana.id, body: 'b', createdAt: new Date(2), readAt: null },
      { senderId: ana.id, recipientId: luis, body: 'a', createdAt: new Date(1), readAt: null },
    ]);
    prisma.memberProfile.findMany.mockResolvedValue([{ memberId: luis, displayName: 'Luis' }]);
    const list = await service.conversations(ana);
    expect(list).toEqual([expect.objectContaining({ memberId: luis, displayName: 'Luis', lastMessage: 'b', unread: 1 })]);
  });
});
