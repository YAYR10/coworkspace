import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DirectoryClient } from '../clients/directory.client';
import { DomainEvent, EventStream } from '../events/event-stream.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from './mailer.service';
import { buildMessage, HANDLED, toHtml } from './templates';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stream: EventStream,
    private readonly directory: DirectoryClient,
    private readonly mailer: MailerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    await this.stream.start((event) => this.handle(event));
    this.logger.log(`Escuchando eventos (${this.mailer.enabled ? 'envío por Brevo' : 'modo demostración, sin enviar correos'})`);
  }

  /** Procesa un evento de dominio: arma el correo, lo envía y lo registra (una sola vez por evento). */
  async handle(event: DomainEvent): Promise<void> {
    if (!HANDLED.includes(event.type) || !event.data?.memberId) return;
    if (await this.prisma.notification.findUnique({ where: { eventId: event.id } })) return; // idempotencia

    const contact = await this.directory.contact(event.data.memberId);
    if (!contact) {
      this.logger.warn(`Miembro ${event.data.memberId} no encontrado para ${event.type}`);
      return;
    }
    const place = event.type.startsWith('booking.') && event.data.resourceId
      ? await this.directory.place(event.data.resourceType, event.data.resourceId, event.data.locationId)
      : null;
    const message = buildMessage(event, contact.name, place);
    if (!message) return;

    const result = await this.mailer.send({ email: contact.email, name: contact.name }, message.subject, toHtml(message));
    await this.prisma.notification.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        memberId: event.data.memberId,
        email: contact.email,
        subject: message.subject,
        body: message.text,
        status: result.status,
        error: result.error,
      },
    });
    this.logger.log(`[${result.status}] ${event.type} → ${contact.email}`);
  }

  mine(memberId: string) {
    return this.prisma.notification.findMany({
      where: { memberId },
      select: { id: true, eventType: true, subject: true, body: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  all() {
    return this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  status() {
    return { mode: this.mailer.enabled ? 'email' : 'demo', from: this.mailer.enabled ? process.env.MAIL_FROM : null };
  }
}
