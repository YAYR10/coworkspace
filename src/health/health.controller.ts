import { Controller, Get } from '@nestjs/common';
import { serviceUrls } from '../gateway/routes';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'api-gateway', time: new Date().toISOString() };
  }

  /** Estado de todos los microservicios (útil para la demo y para despertar instancias free de Render). */
  @Get('services')
  async services() {
    const entries = await Promise.all(
      Object.entries(serviceUrls()).map(async ([name, url]) => {
        const started = Date.now();
        try {
          const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(60_000) });
          return [name, { status: res.ok ? 'up' : 'down', httpStatus: res.status, latencyMs: Date.now() - started }];
        } catch (err) {
          return [name, { status: 'down', error: err.message }];
        }
      }),
    );
    return Object.fromEntries(entries);
  }
}
