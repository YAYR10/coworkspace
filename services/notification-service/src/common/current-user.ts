import { createParamDecorator, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

/**
 * Roles de CoworkSpace:
 *  - ADMIN (jefe administrador): puede hacer todo.
 *  - COORDINATOR: publica y administra sedes, salas, puestos y servicios; ve la ocupación.
 *  - MEMBER: usuario normal que reserva.
 */
export type Role = 'MEMBER' | 'COORDINATOR' | 'ADMIN';
export const ROLES: Role[] = ['MEMBER', 'COORDINATOR', 'ADMIN'];

export interface AuthUser {
  id: string;
  role: Role;
  email?: string;
}

/** El API Gateway valida el JWT y reenvía la identidad en headers x-user-*. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  const id = req.headers['x-user-id'];
  if (!id) throw new UnauthorizedException('Autenticación requerida');
  return { id, role: (req.headers['x-user-role'] ?? 'MEMBER') as Role, email: req.headers['x-user-email'] };
});

/** Identidad opcional: para rutas públicas que muestran más datos al personal. */
export const OptionalUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | null => {
  const req = ctx.switchToHttp().getRequest();
  const id = req.headers['x-user-id'];
  return id ? { id, role: (req.headers['x-user-role'] ?? 'MEMBER') as Role, email: req.headers['x-user-email'] } : null;
});

export const isAdmin = (user?: AuthUser | null) => user?.role === 'ADMIN';
export const isStaff = (user?: AuthUser | null) => user?.role === 'ADMIN' || user?.role === 'COORDINATOR';

export function assertAdmin(user: AuthUser): void {
  if (!isAdmin(user)) throw new ForbiddenException('Solo el administrador puede hacer esto');
}

/** Administrador o coordinador. */
export function assertStaff(user: AuthUser): void {
  if (!isStaff(user)) throw new ForbiddenException('Requiere rol de coordinador o administrador');
}
