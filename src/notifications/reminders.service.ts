import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEvent } from '../events/event-stream.service';
import { PrismaService } from '../prisma/prisma.service';

const BOOKING_LEAD_MIN = () => Number(process.env.REMINDER_MINUTES_BEFORE ?? 60);
const MEMBERSHIP_LEAD_DAYS = () => Number(process.env.MEMBERSHIP_WARNING_DAYS ?? 3);

/**
 * Programa recordatorios a partir de los eventos de dominio y los envía cuando llega la hora.
 * El envío reutiliza el mismo flujo de correo (con idempotencia por id de recordatorio).
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private sender?: (event: DomainEvent) => Promise<void>;
  private busy = false;

  constructor(private readonly prisma: PrismaService) {}

  onSend(sender: (event: DomainEvent) => Promise<void>) {
    this.sender = sender;
  }

  async schedule(event: DomainEvent): Promise<void> {
    const d = event.data ?? {};
    switch (event.type) {
      case 'booking.confirmed': {
        const sendAt = new Date(new Date(d.startTime).getTime() - BOOKING_LEAD_MIN() * 60000);
        if (sendAt <= new Date()) return; // empieza muy pronto: basta con la confirmación
        await this.upsert('BOOKING_REMINDER', d.bookingId, d.memberId, sendAt, d);
        break;
      }
      case 'booking.cancelled':
        await this.cancel('BOOKING_REMINDER', d.bookingId);
        break;
      case 'membership.activated': {
        if (!d.renewsAt) return;
        const sendAt = new Date(new Date(d.renewsAt).getTime() - MEMBERSHIP_LEAD_DAYS() * 86400000);
        if (sendAt <= new Date()) return;
        await this.upsert('MEMBERSHIP_EXPIRING', d.subscriptionId, d.memberId, sendAt, d);
        break;
      }
      case 'membership.expired':
        await this.cancel('MEMBERSHIP_EXPIRING', d.subscriptionId);
        break;
    }
  }

  private upsert(kind: 'BOOKING_REMINDER' | 'MEMBERSHIP_EXPIRING', refId: string, memberId: string, sendAt: Date, payload: any) {
    if (!refId || !memberId) return;
    return this.prisma.reminder.upsert({
      where: { kind_refId: { kind, refId } },
      create: { kind, refId, memberId, sendAt, payload },
      // En una renovación cambia la fecha: se reprograma el aviso del nuevo periodo
      update: { sendAt, payload, status: 'PENDING', sentAt: null },
    });
  }

  private cancel(kind: 'BOOKING_REMINDER' | 'MEMBERSHIP_EXPIRING', refId: string) {
    if (!refId) return;
    return this.prisma.reminder.updateMany({ where: { kind, refId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  }

  /** Cada minuto: envía los recordatorios vencidos. Si el servicio estuvo dormido, se ponen al día al despertar. */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDue(): Promise<number> {
    if (this.busy || !this.sender || process.env.NODE_ENV === 'test') return 0;
    this.busy = true;
    try {
      const due = await this.prisma.reminder.findMany({ where: { status: 'PENDING', sendAt: { lte: new Date() } }, orderBy: { sendAt: 'asc' }, take: 50 });
      for (const r of due) {
        const p = r.payload as any;
        const stale = r.kind === 'BOOKING_REMINDER' ? new Date(p.startTime) <= new Date() : new Date(p.renewsAt) <= new Date();
        if (!stale) {
          await this.sender({
            id: `reminder:${r.id}:${r.sendAt.getTime()}`,
            type: r.kind === 'BOOKING_REMINDER' ? 'booking.reminder' : 'membership.expiring',
            source: 'notification-service',
            occurredAt: new Date().toISOString(),
            data: p,
          });
        }
        await this.prisma.reminder.update({ where: { id: r.id }, data: { status: stale ? 'CANCELLED' : 'SENT', sentAt: stale ? null : new Date() } });
      }
      if (due.length) this.logger.log(`Recordatorios procesados: ${due.length}`);
      return due.length;
    } catch (err) {
      this.logger.error(`Error enviando recordatorios: ${err.message}`);
      return 0;
    } finally {
      this.busy = false;
    }
  }

  upcoming(memberId: string) {
    return this.prisma.reminder.findMany({ where: { memberId, status: 'PENDING' }, orderBy: { sendAt: 'asc' }, take: 20 });
  }
}
