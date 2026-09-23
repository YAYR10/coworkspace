import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Solo el API Gateway (y los demás microservicios) conocen INTERNAL_API_KEY.
 * Así, aunque el servicio tenga URL pública (plan free de Render), nadie puede
 * saltarse el Gateway ni falsificar los headers x-user-*.
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) return true; // desarrollo local sin clave
    const req = ctx.switchToHttp().getRequest();
    const path: string = req.path ?? req.url ?? '';
    if (path.startsWith('/health') || path.startsWith('/metrics')) return true;
    if (req.headers['x-internal-key'] !== expected) {
      throw new ForbiddenException('Acceso permitido solo a través del API Gateway');
    }
    return true;
  }
}
