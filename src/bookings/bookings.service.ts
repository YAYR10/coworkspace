import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Booking, BookingStatus, ResourceType } from '@prisma/client';
import { AuthUser } from '../common/current-user';
import { EventBus } from '../events/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpaceClient } from '../space/space.client';
import { BookingMetrics } from './booking.metrics';
import { AvailabilityQueryDto, CreateBookingDto } from './bookings.dto';

const ACTIVE: BookingStatus[] = ['PENDING', 'CONFIRMED'];

export class OptimisticLockError extends Error {
  constructor() {
    super('La versión del recurso cambió durante la reserva');
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ReserveInput {
  memberId: string;
  resourceId: string;
  resourceType: ResourceType;
  locationId: string;
  start: Date;
  end: Date;
}

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly space: SpaceClient,
    private readonly events: EventBus,
    private readonly metrics: BookingMetrics,
  ) {}

  /** Saga coreografiada: Billing responde a booking.created con approved / rejected. */
  async onModuleInit(): Promise<void> {
    await this.events.subscribe('billing.charge.approved', (e) => this.onChargeApproved(e.data));
    await this.events.subscribe('billing.charge.rejected', (e) => this.onChargeRejected(e.data));
  }

  // ------------------------------------------------------------------ crear reserva
  async create(memberId: string, dto: CreateBookingDto): Promise<Booking> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    this.validateWindow(start, end);

    // 1) Consulta síncrona a Space Service
    const resource = await this.space.getResource(dto.resourceType, dto.resourceId);
    if (!resource.isActive) throw new ConflictException('El recurso no está habilitado para reservas');

    // 2) Reserva con bloqueo optimista
    const booking = await this.reserveWithOptimisticLock({
      memberId,
      resourceId: dto.resourceId,
      resourceType: dto.resourceType,
      locationId: resource.locationId,
      start,
      end,
    });
    this.metrics.created(booking.resourceType);
    this.logger.log(`[booking_id=${booking.id}] creada en estado PENDING para ${booking.resourceType} ${booking.resourceId}`);

    // 3) Inicia la saga
    await this.events.publish('booking.created', this.toEvent(booking));
    return booking;
  }

  /**
   * Bloqueo optimista: cada recurso tiene una fila con `version`.
   *  - Se lee la versión y se verifica que no haya solapamiento.
   *  - En la transacción se hace UPDATE ... WHERE version = <leída>.
   *  - Si otra reserva concurrente ganó, el UPDATE afecta 0 filas -> se reintenta
   *    y en el reintento el solapamiento se detecta (409). Nunca hay doble reserva.
   */
  async reserveWithOptimisticLock(input: ReserveInput): Promise<Booking> {
    const maxAttempts = Number(process.env.OPTIMISTIC_LOCK_MAX_RETRIES ?? 5);
    await this.prisma.resourceLock.createMany({ data: [{ resourceId: input.resourceId }], skipDuplicates: true });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const lock = await this.prisma.resourceLock.findUniqueOrThrow({ where: { resourceId: input.resourceId } });

      const overlap = await this.prisma.booking.findFirst({
        where: {
          resourceId: input.resourceId,
          status: { in: ACTIVE },
          startTime: { lt: input.end },
          endTime: { gt: input.start },
        },
        select: { id: true },
      });
      if (overlap) {
        this.metrics.conflict();
        throw new ConflictException({
          statusCode: 409,
          message: 'El recurso ya está reservado en ese horario',
          hint: 'Puedes unirte a la lista de espera con POST /api/bookings/waitlist',
        });
      }

      try {
        return await this.prisma.$transaction(async (tx) => {
          const updated = await tx.resourceLock.updateMany({
            where: { resourceId: input.resourceId, version: lock.version },
            data: { version: { increment: 1 } },
          });
          if (updated.count === 0) throw new OptimisticLockError();
          return tx.booking.create({
            data: {
              memberId: input.memberId,
              resourceId: input.resourceId,
              resourceType: input.resourceType,
              locationId: input.locationId,
              startTime: input.start,
              endTime: input.end,
            },
          });
        });
      } catch (err) {
        if (!(err instanceof OptimisticLockError)) throw err;
        this.metrics.retry();
        this.logger.warn(`Conflicto optimista sobre ${input.resourceId} (intento ${attempt}/${maxAttempts})`);
        await sleep(10 + Math.random() * 40 * attempt);
      }
    }
    throw new ConflictException('Alta demanda sobre el recurso, intenta de nuevo en unos segundos');
  }

  private validateWindow(start: Date, end: Date): void {
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Fechas inválidas');
    if (end <= start) throw new BadRequestException('endTime debe ser posterior a startTime');
    if (start.getTime() < Date.now() - 60_000) throw new BadRequestException('No se puede reservar en el pasado');
    const maxHours = Number(process.env.MAX_BOOKING_HOURS ?? 12);
    if (end.getTime() - start.getTime() > maxHours * 3_600_000) {
      throw new BadRequestException(`Una reserva no puede superar ${maxHours} horas`);
    }
  }

  // ------------------------------------------------------------------ consultas
  findMine(memberId: string) {
    return this.prisma.booking.findMany({ where: { memberId }, orderBy: { startTime: 'desc' }, take: 100 });
  }

  async findOne(user: AuthUser, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || (booking.memberId !== user.id && user.role !== 'ADMIN')) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }

  async availability(query: AvailabilityQueryDto) {
    const busy = await this.prisma.booking.findMany({
      where: { resourceId: query.resourceId, status: { in: ACTIVE }, startTime: { lt: query.to }, endTime: { gt: query.from } },
      select: { startTime: true, endTime: true, status: true },
      orderBy: { startTime: 'asc' },
    });
    return { resourceId: query.resourceId, from: query.from, to: query.to, busy };
  }

  // ------------------------------------------------------------------ cancelación
  async cancel(user: AuthUser, id: string) {
    const booking = await this.findOne(user, id);
    if (booking.status === 'CANCELLED') throw new ConflictException('La reserva ya está cancelada');
    const cancelled = await this.markCancelled(booking.id, 'CANCELLED_BY_MEMBER', ACTIVE);
    if (!cancelled) throw new ConflictException('La reserva cambió de estado, vuelve a consultarla');
    return cancelled;
  }

  // ------------------------------------------------------------------ saga
  async onChargeApproved(data: { bookingId: string; amount: number }): Promise<void> {
    const result = await this.prisma.booking.updateMany({
      where: { id: data.bookingId, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
    if (result.count === 0) return; // idempotencia: ya procesado o cancelado
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: data.bookingId } });
    this.metrics.confirmed();
    this.logger.log(`[booking_id=${booking.id}] CONFIRMED (cargo adicional: ${data.amount})`);
    await this.events.publish('booking.confirmed', { ...this.toEvent(booking), extraCharge: data.amount });
  }

  /** Compensación de la saga: el cobro fue rechazado -> se libera la reserva. */
  async onChargeRejected(data: { bookingId: string; reason?: string }): Promise<void> {
    const booking = await this.markCancelled(data.bookingId, 'PAYMENT_REJECTED', ['PENDING']);
    if (booking) this.logger.warn(`[booking_id=${booking.id}] compensada: cobro rechazado (${data.reason ?? 'sin detalle'})`);
  }

  /** Si Billing nunca responde (evento perdido), la reserva no queda PENDING para siempre. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireStalePending(): Promise<number> {
    const minutes = Number(process.env.SAGA_TIMEOUT_MINUTES ?? 5);
    const stale = await this.prisma.booking.findMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - minutes * 60_000) } },
      select: { id: true },
    });
    for (const { id } of stale) await this.markCancelled(id, 'SAGA_TIMEOUT', ['PENDING']);
    return stale.length;
  }

  private async markCancelled(id: string, reason: string, from: BookingStatus[]): Promise<Booking | null> {
    const result = await this.prisma.booking.updateMany({
      where: { id, status: { in: from } },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
    if (result.count === 0) return null;
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id } });
    this.metrics.cancelled(reason);
    await this.events.publish('booking.cancelled', { ...this.toEvent(booking), reason });
    await this.promoteWaitlist(booking);
    return booking;
  }

  // ------------------------------------------------------------------ lista de espera
  async joinWaitlist(memberId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    this.validateWindow(start, end);
    await this.space.getResource(dto.resourceType, dto.resourceId);
    return this.prisma.waitlistEntry.create({
      data: { memberId, resourceId: dto.resourceId, resourceType: dto.resourceType, startTime: start, endTime: end },
    });
  }

  findMyWaitlist(memberId: string) {
    return this.prisma.waitlistEntry.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' } });
  }

  /** Al liberarse un recurso, el primero en la lista de espera recibe la reserva automáticamente. */
  async promoteWaitlist(freed: Booking): Promise<void> {
    const candidates = await this.prisma.waitlistEntry.findMany({
      where: { resourceId: freed.resourceId, status: 'WAITING', startTime: { lt: freed.endTime }, endTime: { gt: freed.startTime } },
      orderBy: { createdAt: 'asc' },
    });
    for (const entry of candidates) {
      if (entry.startTime.getTime() < Date.now()) {
        await this.prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'EXPIRED' } });
        continue;
      }
      try {
        const booking = await this.create(entry.memberId, {
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          startTime: entry.startTime.toISOString(),
          endTime: entry.endTime.toISOString(),
        });
        await this.prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'PROMOTED', bookingId: booking.id } });
        await this.events.publish('booking.waitlist.promoted', { waitlistEntryId: entry.id, bookingId: booking.id, memberId: entry.memberId });
      } catch (err) {
        if (!(err instanceof ConflictException)) this.logger.error(`Error promoviendo lista de espera ${entry.id}: ${err.message}`);
      }
    }
  }

  private toEvent(b: Booking) {
    return {
      bookingId: b.id,
      memberId: b.memberId,
      resourceId: b.resourceId,
      resourceType: b.resourceType,
      locationId: b.locationId,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      hours: Math.round(((b.endTime.getTime() - b.startTime.getTime()) / 3_600_000) * 100) / 100,
      status: b.status,
    };
  }
}
