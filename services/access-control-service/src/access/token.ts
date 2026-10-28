import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Formato del token que va dentro del QR o de la etiqueta NFC: cw1.<idCredencial>.<secreto> */
export const TOKEN_PREFIX = 'cw1';

export function newSecret(): string {
  return randomBytes(24).toString('base64url');
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function buildToken(credentialId: string, secret: string): string {
  return `${TOKEN_PREFIX}.${credentialId}.${secret}`;
}

export function parseToken(token: string): { credentialId: string; secret: string } | null {
  const parts = (token ?? '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !parts[1] || !parts[2]) return null;
  return { credentialId: parts[1], secret: parts[2] };
}

/** Comparación en tiempo constante para no filtrar información por tiempos de respuesta. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}
