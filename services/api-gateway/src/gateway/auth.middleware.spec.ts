import * as jwt from 'jsonwebtoken';
import { createAuthMiddleware } from './auth.middleware';

const SECRET = 'test-secret';

function run(req: any) {
  const res: any = { statusCode: 200, body: null };
  res.status = jest.fn((code: number) => ((res.statusCode = code), res));
  res.json = jest.fn((body: any) => ((res.body = body), res));
  const next = jest.fn();
  createAuthMiddleware(SECRET)({ headers: {}, method: 'GET', ...req }, res, next);
  return { res, next };
}

describe('AuthMiddleware', () => {
  it('permite rutas públicas sin token', () => {
    const { next } = run({ method: 'POST', path: '/api/auth/login' });
    expect(next).toHaveBeenCalled();
  });

  it('rechaza rutas protegidas sin token', () => {
    const { res, next } = run({ path: '/api/bookings/me' });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('valida el JWT y reenvía la identidad en headers', () => {
    const token = jwt.sign({ sub: 'm-1', role: 'MEMBER', email: 'a@b.co' }, SECRET);
    const req: any = { path: '/api/bookings/me', headers: { authorization: `Bearer ${token}` } };
    const { next } = run(req);
    expect(next).toHaveBeenCalled();
    expect(req.headers['x-user-id']).toBe('m-1');
  });

  it('elimina headers de identidad falsificados por el cliente', () => {
    const req: any = { method: 'GET', path: '/api/plans', headers: { 'x-user-id': 'hacker', 'x-user-role': 'ADMIN' } };
    run(req);
    expect(req.headers['x-user-id']).toBeUndefined();
    expect(req.headers['x-user-role']).toBeUndefined();
  });

  it('bloquea endpoints internos', () => {
    const token = jwt.sign({ sub: 'm-1', role: 'MEMBER', email: 'a@b.co' }, SECRET);
    const { res } = run({ path: '/api/subscriptions/member/x/active', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(404);
  });

  it('rechaza tokens firmados con otra clave', () => {
    const token = jwt.sign({ sub: 'm-1', role: 'ADMIN' }, 'otra-clave');
    const { res } = run({ path: '/api/bookings/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });
});
