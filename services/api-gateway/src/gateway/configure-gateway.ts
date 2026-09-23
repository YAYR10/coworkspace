import { INestApplication, Logger } from '@nestjs/common';
import { rateLimit } from 'express-rate-limit';
import { ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { randomUUID } from 'crypto';
import { createAuthMiddleware } from './auth.middleware';
import { buildRoutes } from './routes';

const logger = new Logger('Gateway');

export function configureGateway(app: INestApplication): void {
  const jwtSecret = process.env.JWT_SECRET ?? 'dev-jwt-secret-cambia-esto';
  const internalKey = process.env.INTERNAL_API_KEY;

  // Request id para trazabilidad entre servicios
  app.use((req: any, res: any, next: () => void) => {
    const id = req.headers['x-request-id'] ?? randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  });

  // Rate limiting (más estricto en login para frenar fuerza bruta)
  const limiter = (limit: number) =>
    rateLimit({
      windowMs: 60_000,
      limit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Demasiadas solicitudes, intenta de nuevo en un minuto' },
    });
  app.use('/api/auth/login', limiter(Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE ?? 10)));
  app.use('/api', limiter(Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120)));

  app.use(createAuthMiddleware(jwtSecret));

  for (const route of buildRoutes()) {
    app.use(
      createProxyMiddleware({
        target: route.target,
        pathFilter: route.prefix,
        pathRewrite: { '^/api': '' },
        changeOrigin: true,
        proxyTimeout: Number(process.env.PROXY_TIMEOUT_MS ?? 60_000),
        on: {
          proxyReq: (proxyReq) => {
            if (internalKey) proxyReq.setHeader('x-internal-key', internalKey);
          },
          error: (err, _req, res) => {
            logger.error(`Error al contactar ${route.target}: ${err.message}`);
            if (res instanceof ServerResponse && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 502, message: 'Servicio no disponible temporalmente' }));
            }
          },
        },
      }),
    );
    logger.log(`${route.prefix}/* -> ${route.target}`);
  }
}
