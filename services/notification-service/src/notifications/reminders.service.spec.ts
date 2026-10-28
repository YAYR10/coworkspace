import { RemindersService } from './reminders.service';
import { buildMessage } from './templates';

const ev = (type: string, data: any) => ({ id: 'e', type, source: 'x', occurredAt: '', data });

describe('RemindersService', () => {
  let prisma: any;
  let service: RemindersService;
  const inHours = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

  beforeEach(() => {
    delete process.env.REMINDER_MINUTES_BEFORE;
    prisma = { reminder: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), update: jest.fn() } };
    service = new RemindersService(prisma);
  });

  it('programa el recordatorio una hora antes de la reserva confirmada', async () => {
    const start = inHours(5);
    await service.schedule(ev('booking.confirmed', { bookingId: 'b-1', memberId: 'm-1', startTime: start }));
    const arg = prisma.reminder.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ kind: 'BOOKING_REMINDER', refId: 'b-1' });
    expect(new Date(start).getTime() - arg.create.sendAt.getTime()).toBe(3600000);
  });

  it('no programa si la reserva empieza en menos de una hora y cancela si la reserva se cancela', async () => {
    await service.schedule(ev('booking.confirmed', { bookingId: 'b-1', memberId: 'm-1', startTime: inHours(0.5) }));
    expect(prisma.reminder.upsert).not.toHaveBeenCalled();
    await service.schedule(ev('booking.cancelled', { bookingId: 'b-1' }));
    expect(prisma.reminder.updateMany).toHaveBeenCalledWith({ where: { kind: 'BOOKING_REMINDER', refId: 'b-1', status: 'PENDING' }, data: { status: 'CANCELLED' } });
  });

  it('avisa 3 días antes de que venza la membresía', async () => {
    const renewsAt = inHours(24 * 30);
    await service.schedule(ev('membership.activated', { subscriptionId: 's-1', memberId: 'm-1', renewsAt, planName: 'Flex' }));
    const arg = prisma.reminder.upsert.mock.calls[0][0];
    expect(arg.create.kind).toBe('MEMBERSHIP_EXPIRING');
    expect(new Date(renewsAt).getTime() - arg.create.sendAt.getTime()).toBe(3 * 86400000);
  });

  it('envía los recordatorios vencidos por el flujo normal de correo', async () => {
    const sender = jest.fn();
    service.onSend(sender);
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    prisma.reminder.findMany.mockResolvedValue([
      { id: 'r-1', kind: 'BOOKING_REMINDER', sendAt: new Date(), payload: { memberId: 'm-1', startTime: inHours(1), endTime: inHours(2) } },
      { id: 'r-2', kind: 'BOOKING_REMINDER', sendAt: new Date(), payload: { memberId: 'm-1', startTime: inHours(-1) } },
    ]);
    await service.dispatchDue();
    process.env.NODE_ENV = env;
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].type).toBe('booking.reminder');
    expect(prisma.reminder.update).toHaveBeenCalledWith({ where: { id: 'r-2' }, data: { status: 'CANCELLED', sentAt: null } });
  });

  it('plantillas de recordatorio y vencimiento', () => {
    const r = buildMessage(ev('booking.reminder', { startTime: inHours(1), endTime: inHours(2) }), 'Ana Demo', null)!;
    expect(r.subject).toContain('Recordatorio');
    const m = buildMessage(ev('membership.expiring', { renewsAt: inHours(72), planName: 'Flex' }), 'Ana Demo', null)!;
    expect(m.subject).toContain('Tu plan Flex vence');
  });
});
