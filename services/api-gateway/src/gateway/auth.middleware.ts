import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { INTERNAL_ONLY, PUBLIC_ROUTES } from './routes';

const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-email', 'x-internal-key'];

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  role: string;
  email: string;
}

/**
 * Autenticación centralizada:
 *  1. Borra cualquier header de identidad que venga del cliente (anti-spoofing).
 *  2. Valida el JWT y reenvía la identidad a los microservicios en headers x-user-*.
 */
export function createAuthMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const header of IDENTITY_HEADERS) delete req.headers[header];
    if (!req.path.startsWith('/api/')) return next();

    if (INTERNAL_ONLY.some((pattern) => pattern.test(req.path))) {
      return res.status(404).json({ statusCode: 404, message: 'Ruta no encontrada' });
    }

    const isPublic = PUBLIC_ROUTES.some((route) => route.method === req.method && route.pattern.test(req.path));
    const authorization = req.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authorization.slice(7), secret) as AccessTokenPayload;
        req.headers['x-user-id'] = payload.sub;
        req.headers['x-user-role'] = payload.role;
        req.headers['x-user-email'] = payload.email;
      } catch {
        if (!isPublic) return res.status(401).json({ statusCode: 401, message: 'Token inválido o expirado' });
      }
    } else if (!isPublic) {
      return res.status(401).json({ statusCode: 401, message: 'Token de acceso requerido' });
    }
    next();
  };
}
