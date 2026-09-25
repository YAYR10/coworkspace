import { createParamDecorator, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

export interface AuthUser {
  id: string;
  role: string;
  email?: string;
}

/** El API Gateway valida el JWT y reenvía la identidad en headers x-user-*. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  const id = req.headers['x-user-id'];
  if (!id) throw new UnauthorizedException('Autenticación requerida');
  return { id, role: req.headers['x-user-role'] ?? 'MEMBER', email: req.headers['x-user-email'] };
});

export function assertAdmin(user: AuthUser): void {
  if (user.role !== 'ADMIN') throw new ForbiddenException('Requiere rol ADMIN');
}
