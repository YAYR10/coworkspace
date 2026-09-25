import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export interface DomainEvent<T = any> {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  data: T;
}

type Handler = (event: DomainEvent) => unknown;

/** Bus de eventos sobre Redis Pub/Sub. El canal es el tipo de evento (p. ej. booking.created). */
@Injectable()
export class EventBus implements OnModuleDestroy {
  private readonly logger = new Logger(EventBus.name);
  private readonly source = process.env.SERVICE_NAME ?? 'booking-service';
  private readonly handlers = new Map<string, Handler[]>();
  private publisher?: Redis;
  private subscriber?: Redis;

  async publish<T>(type: string, data: T): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      type,
      source: this.source,
      occurredAt: new Date().toISOString(),
      data,
    };
    await this.getPublisher().publish(type, JSON.stringify(event));
    this.logger.log(`Evento publicado ${type} (${event.id})`);
    return event;
  }

  async subscribe(type: string, handler: Handler): Promise<void> {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    if (list.length === 1) await this.getSubscriber().subscribe(type);
    this.logger.log(`Suscrito a ${type}`);
  }

  private async dispatch(channel: string, raw: string): Promise<void> {
    let event: DomainEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      this.logger.warn(`Mensaje inválido recibido en ${channel}`);
      return;
    }
    for (const handler of this.handlers.get(channel) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error(`Error procesando ${channel} (${event.id}): ${err.message}`);
      }
    }
  }

  private getPublisher(): Redis {
    if (!this.publisher) this.publisher = this.createClient('publisher');
    return this.publisher;
  }

  private getSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = this.createClient('subscriber');
      this.subscriber.on('message', (channel: string, raw: string) => void this.dispatch(channel, raw));
    }
    return this.subscriber;
  }

  private createClient(role: string): Redis {
    const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
    client.on('error', (err) => this.logger.error(`Redis (${role}): ${err.message}`));
    return client;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.publisher?.quit(), this.subscriber?.quit()]);
  }
}
