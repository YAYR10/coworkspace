import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

export interface SpaceResource {
  id: string;
  type: 'ROOM' | 'DESK';
  locationId: string;
  name: string;
  capacity: number;
  isActive: boolean;
}

export const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

/** Comunicación síncrona (REST) con Space Service antes de confirmar una reserva. */
@Injectable()
export class SpaceClient {
  private readonly logger = new Logger(SpaceClient.name);
  private readonly baseUrl = normalizeUrl(process.env.SPACE_SERVICE_URL ?? 'http://localhost:3002');
  private readonly timeoutMs = Number(process.env.SPACE_TIMEOUT_MS ?? 10000);

  async getResource(type: string, id: string): Promise<SpaceResource> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/resources/${type}/${id}`, {
        headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      this.logger.error(`Space Service no respondió: ${err.message}`);
      throw new ServiceUnavailableException('Space Service no disponible, intenta de nuevo');
    }
    if (response.status === 404) throw new NotFoundException('El recurso no existe');
    if (!response.ok) throw new ServiceUnavailableException(`Space Service respondió ${response.status}`);
    return (await response.json()) as SpaceResource;
  }
}
