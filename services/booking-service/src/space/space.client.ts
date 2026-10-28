import { Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';

export interface SpaceResource {
  id: string;
  type: 'ROOM' | 'DESK';
  locationId: string;
  name: string;
  capacity: number;
  isActive: boolean;
}

export const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

/** URL de Space Service: variable de entorno o, en Render, la dirección pública por defecto del Blueprint. */
export function spaceServiceUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SPACE_SERVICE_URL?.trim()) return normalizeUrl(env.SPACE_SERVICE_URL.trim());
  if (env.RENDER) return 'https://coworkspace-space.onrender.com';
  return 'http://localhost:3002';
}

const RETRYABLE = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Comunicación síncrona (REST) con Space Service antes de confirmar una reserva.
 * En el plan gratuito de Render, Space puede estar dormido: se reintenta unos segundos
 * (respuestas 502/503/504 o errores de red) antes de rendirse.
 */
@Injectable()
export class SpaceClient implements OnModuleInit {
  private readonly logger = new Logger(SpaceClient.name);
  private readonly baseUrl = spaceServiceUrl();
  private readonly timeoutMs = Number(process.env.SPACE_TIMEOUT_MS ?? 20000);
  private readonly budgetMs = Number(process.env.SPACE_RETRY_BUDGET_MS ?? 45000);

  onModuleInit(): void {
    this.logger.log(`Space Service en ${this.baseUrl}`);
  }

  async getResource(type: string, id: string): Promise<SpaceResource> {
    const deadline = Date.now() + this.budgetMs;
    let lastError = '';
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/resources/${type}/${id}`, {
          headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
          signal: AbortSignal.timeout(Math.max(1000, Math.min(this.timeoutMs, deadline - Date.now()))),
        });
        if (response.status === 404) throw new NotFoundException('El recurso no existe');
        if (response.ok) return (await response.json()) as SpaceResource;
        lastError = `respondió ${response.status}`;
        if (!RETRYABLE.has(response.status)) break;
      } catch (err) {
        if (err instanceof NotFoundException) throw err;
        lastError = err.cause?.code ?? err.message;
      }
      if (Date.now() + 2000 > deadline) break;
      this.logger.warn(`Space Service no disponible (${lastError}), reintento ${attempt}…`);
      await sleep(Math.min(1000 * attempt, 5000));
    }
    this.logger.error(`Space Service en ${this.baseUrl} falló: ${lastError}`);
    throw new ServiceUnavailableException('No pudimos verificar el espacio en este momento. Intenta de nuevo en unos segundos.');
  }
}
