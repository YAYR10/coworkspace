import { NotificationsService } from './notifications.service';
import { buildMessage } from './templates';

const event = (type: string, data: any, id = 'evt-1') => ({ id, type, source: 'booking-service', occurredAt: new Date().toISOString(), data });
const booking = { memberId: 'm-1', resourceId: 'r-1', resourceType: 'ROOM', locationId: 'l-1', startTime: '2026-12-01T19:00:00.000Z', endTime: '2026-12-01T21:00:00.000Z' };
const place = { resource: 'Sala Sinú', location: 'Sede Centro', address: 'Cra 3 # 27-10, Montería' };

describe('Plantillas de correo', () => {
  it('reserva confirmada con cobro adicional', () => {
    const msg = buildMessage(event('booking.confirmed', { ...booking, extraCharge: 100000 }), 'Ana Demo', place)!;
    expect(msg.subject).toContain('Reserva confirmada: Sala Sinú');
    expect(msg.text).toContain('Hola Ana');
    expect(msg.text).toContain('Sede Centro');
    expect(msg.text).toMatch(/100\.000/);
  });

  it('compensación de la saga: cancelada por pago rechazado', () => {
    const msg = buildMessage(event('booking.cancelled', { ...booking, reason: 'PAYMENT_REJECTED' }), 'Ana Demo', place)!;
    expect(msg.subject).toContain('fue cancelada');
    expect(msg.text).toContain('No pudimos aprobar el cobro');
  });

  it('ignora eventos que no generan correo', () => {
    expect(buildMessage(event('booking.created', booking), 'Ana', place)).toBeNull();
  });
});

describe('NotificationsService.handle', () => {
  let prisma: any;
  let directory: any;
  let mailer: any;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = { notification: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() } };
    directory = { contact: jest.fn().mockResolvedValue({ name: 'Ana Demo', email: 'ana@test.co' }), place: jest.fn().mockResolvedValue(place) };
    mailer = { enabled: false, send: jest.fn().mockResolvedValue({ status: 'LOGGED' }) };
    service = new NotificationsService(prisma, {} as any, directory, mailer);
  });

  it('envía y registra el correo de una reserva confirmada', async () => {
    await service.handle(event('booking.confirmed', { ...booking, extraCharge: 0 }));
    expect(mailer.send).toHaveBeenCalledWith({ email: 'ana@test.co', name: 'Ana Demo' }, expect.stringContaining('Reserva confirmada'), expect.stringContaining('<html'));
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: 'evt-1', status: 'LOGGED', email: 'ana@test.co' }) });
  });

  it('no envía dos veces el mismo evento (idempotencia)', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 'ya-enviado' });
    await service.handle(event('booking.confirmed', booking));
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('no consulta nada para eventos que no le interesan', async () => {
    await service.handle(event('billing.charge.approved', { memberId: 'm-1' }));
    expect(directory.contact).not.toHaveBeenCalled();
  });
});
