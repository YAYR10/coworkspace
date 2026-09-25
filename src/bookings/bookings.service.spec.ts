import { ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

const BASE = Date.now();
const future = (h: number) => new Date(BASE + h * 3_600_000).toISOString();
const dto = { resourceType: 'ROOM' as const, resourceId: '11111111-1111-4111-8111-111111111111', startTime: future(24), endTime: future(26) };

const bookingRow = (overrides: any = {}) => ({
  id: 'b-1',
  memberId: 'm-1',
  resourceId: dto.resourceId,
  resourceType: 'ROOM',
  locationId: 'l-1',
  startTime: new Date(dto.startTime),
  endTime: new Date(dto.endTime),
  status: 'PENDING',
  ...overrides,
});

describe('BookingsService', () => {
  let prisma: any;
  let tx: any;
  let events: any;
  let space: any;
  let metrics: any;
  let service: BookingsService;

  beforeEach(() => {
    tx = { resourceLock: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, booking: { create: jest.fn().mockResolvedValue(bookingRow()) } };
    prisma = {
      resourceLock: { createMany: jest.fn(), findUniqueOrThrow: jest.fn().mockResolvedValue({ resourceId: dto.resourceId, version: 3 }) },
      booking: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn() },
      waitlistEntry: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    events = { publish: jest.fn(), subscribe: jest.fn() };
    space = { getResource: jest.fn().mockResolvedValue({ id: dto.resourceId, type: 'ROOM', locationId: 'l-1', isActive: true }) };
    metrics = { created: jest.fn(), conflict: jest.fn(), retry: jest.fn(), cancelled: jest.fn(), confirmed: jest.fn() };
    service = new BookingsService(prisma, space, events, metrics);
  });

  it('crea la reserva en PENDING y publica booking.created (inicio de la saga)', async () => {
    const booking = await service.create('m-1', dto);
    expect(booking.status).toBe('PENDING');
    expect(tx.resourceLock.updateMany).toHaveBeenCalledWith({ where: { resourceId: dto.resourceId, version: 3 }, data: { version: { increment: 1 } } });
    expect(events.publish).toHaveBeenCalledWith('booking.created', expect.objectContaining({ bookingId: 'b-1', hours: 2 }));
  });

  it('rechaza con 409 si existe una reserva solapada', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'otra' });
    await expect(service.create('m-1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('reintenta cuando la versión cambió (conflicto optimista) y luego detecta el solapamiento', async () => {
    tx.resourceLock.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.booking.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'ganadora' });
    await expect(service.create('m-1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(metrics.retry).toHaveBeenCalledTimes(1);
  });

  it('confirma la reserva cuando Billing aprueba el cargo', async () => {
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'CONFIRMED' }));
    await service.onChargeApproved({ bookingId: 'b-1', amount: 0 });
    expect(prisma.booking.updateMany).toHaveBeenCalledWith({ where: { id: 'b-1', status: 'PENDING' }, data: { status: 'CONFIRMED' } });
    expect(events.publish).toHaveBeenCalledWith('booking.confirmed', expect.any(Object));
  });

  it('compensa (libera la reserva) cuando Billing rechaza el cobro', async () => {
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'CANCELLED', cancelReason: 'PAYMENT_REJECTED' }));
    await service.onChargeRejected({ bookingId: 'b-1', reason: 'fondos insuficientes' });
    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b-1', status: { in: ['PENDING'] } },
      data: { status: 'CANCELLED', cancelReason: 'PAYMENT_REJECTED' },
    });
    expect(events.publish).toHaveBeenCalledWith('booking.cancelled', expect.objectContaining({ reason: 'PAYMENT_REJECTED' }));
  });

  it('es idempotente si el evento de Billing llega dos veces', async () => {
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    await service.onChargeApproved({ bookingId: 'b-1', amount: 0 });
    expect(events.publish).not.toHaveBeenCalled();
  });
});
