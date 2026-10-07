import { Injectable, Logger } from '@nestjs/common';

const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

export interface Contact { name: string; email: string }
export interface Place { resource: string; location: string; address: string }

/**
 * Consultas síncronas a otros servicios (con la clave interna):
 *  - Membership: nombre y correo del miembro.
 *  - Space: nombre del espacio y de la sede, para que el correo sea claro.
 */
@Injectable()
export class DirectoryClient {
  private readonly logger = new Logger(DirectoryClient.name);
  private readonly membership = normalizeUrl(process.env.MEMBERSHIP_SERVICE_URL ?? 'http://localhost:3001');
  private readonly space = normalizeUrl(process.env.SPACE_SERVICE_URL ?? 'http://localhost:3002');
  private readonly timeout = Number(process.env.LOOKUP_TIMEOUT_MS ?? 60000);

  private async get<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' }, signal: AbortSignal.timeout(this.timeout) });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      this.logger.warn(`Consulta fallida ${url}: ${err.message}`);
      return null;
    }
  }

  contact(memberId: string) {
    return this.get<Contact>(`${this.membership}/members/${memberId}/contact`);
  }

  async place(resourceType: string, resourceId: string, locationId: string): Promise<Place | null> {
    const [resource, location] = await Promise.all([
      this.get<{ name: string; type: string }>(`${this.space}/resources/${resourceType}/${resourceId}`),
      this.get<{ name: string; address: string; city: string }>(`${this.space}/locations/${locationId}`),
    ]);
    if (!resource && !location) return null;
    return {
      resource: resource ? (resource.type === 'DESK' ? `Puesto ${resource.name}` : resource.name) : 'tu espacio',
      location: location?.name ?? 'la sede',
      address: location ? `${location.address}, ${location.city}` : '',
    };
  }
}
