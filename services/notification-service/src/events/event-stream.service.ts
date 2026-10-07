import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { hostname } from 'os';

export interface DomainEvent<T = any> {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  data: T;
}

export const EVENTS_STREAM = 'coworkspace:events';
export const GROUP = 'notification-service';

type Handler = (event: DomainEvent) => Promise<void>;

/**
 * Consumidor de Redis Streams con grupo de consumidores.
 * A diferencia de Pub/Sub, si el servicio estaba dormido (plan free de Render) los eventos
 * quedan en el stream y se procesan al despertar. Cada evento se confirma (XACK) solo
 * después de procesarlo; si el servicio se cae a mitad, se reintenta al reiniciar.
 */
@Injectable()
export class EventStream implements OnModuleDestroy {
  private readonly logger = new Logger(EventStream.name);
  private readonly consumer = `${hostname()}-${process.pid}`;
  private client?: Redis;
  private running = false;

  async start(handler: Handler): Promise<void> {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
    this.client.on('error', (err) => this.logger.error(`Redis: ${err.message}`));
    try {
      await this.client.xgroup('CREATE', EVENTS_STREAM, GROUP, '0', 'MKSTREAM');
      this.logger.log(`Grupo ${GROUP} creado en ${EVENTS_STREAM}`);
    } catch (err) {
      if (!String(err.message).includes('BUSYGROUP')) throw err;
    }
    this.running = true;
    void this.loop(handler);
  }

  private async loop(handler: Handler): Promise<void> {
    // 1) Primero lo que quedó pendiente de una ejecución anterior; 2) luego eventos nuevos (">").
    let cursor = '0';
    while (this.running) {
      try {
        const res = (await this.client!.xreadgroup('GROUP', GROUP, this.consumer, 'COUNT', 20, 'BLOCK', 5000, 'STREAMS', EVENTS_STREAM, cursor)) as
          | [string, [string, string[]][]][]
          | null;
        const entries = res?.[0]?.[1] ?? [];
        if (cursor === '0' && entries.length === 0) cursor = '>';
        for (const [id, fields] of entries) {
          await this.process(id, fields, handler);
        }
      } catch (err) {
        if (!this.running) return;
        this.logger.error(`Error leyendo el stream: ${err.message}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  private async process(id: string, fields: string[], handler: Handler): Promise<void> {
    const raw = fields[fields.indexOf('event') + 1];
    try {
      await handler(JSON.parse(raw) as DomainEvent);
    } catch (err) {
      // Se registra y se confirma igual: un evento malformado no debe bloquear la cola
      this.logger.error(`No se pudo procesar ${id}: ${err.message}`);
    }
    await this.client!.xack(EVENTS_STREAM, GROUP, id);
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.client?.quit().catch(() => undefined);
  }
}
