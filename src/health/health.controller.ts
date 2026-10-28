import { Controller, Get } from '@nestjs/common';
import { serviceUrls } from '../gateway/routes';

/** Render free responde 502/503 mientras un servicio dormido arranca: se reintenta hasta que conteste. */
const WAKING = new Set([502, 503, 504]);
const WAKE_BUDGET_MS = Number(process.env.HEALTH_WAKE_BUDGET_MS ?? 25_000);

async function probe(url: string) {
  const started = Date.now();
  let last: { status: 'up' | 'down'; httpStatus?: number; error?: string } = { status: 'down' };
  while (Date.now() - started < WAKE_BUDGET_MS) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(Math.max(3_000, WAKE_BUDGET_MS - (Date.now() - started))) });
      await res.body?.cancel().catch(() => undefined);
      if (res.ok) return { status: 'up' as const, httpStatus: res.status, latencyMs: Date.now() - started };
      last = { status: 'down', httpStatus: res.status };
      if (!WAKING.has(res.status)) break;
    } catch (err) {
      last = { status: 'down', error: err.message };
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return { ...last, latencyMs: Date.now() - started };
}

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'api-gateway', time: new Date().toISOString() };
  }

  /** Estado de todos los microservicios. También los despierta (instancias free de Render). */
  @Get('services')
  async services() {
    const entries = await Promise.all(Object.entries(serviceUrls()).map(async ([name, url]) => [name, await probe(url)]));
    return Object.fromEntries(entries);
  }
}
