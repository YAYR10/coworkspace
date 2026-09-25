/** Cliente HTTP del API Gateway: añade el JWT, renueva el token vencido y traduce errores. */
export const API_URL = (import.meta.env.VITE_API_URL || 'https://coworkspace-gateway.onrender.com').replace(/\/$/, '');

export type Role = 'MEMBER' | 'ADMIN';
export interface SessionMember { id: string; name: string; email: string; role: Role }
export interface Session { accessToken: string; refreshToken: string; member: SessionMember }

export interface Plan { id: string; code: string; name: string; price: number; resourceAccess: ResourceType[]; description?: string | null }
export interface Subscription { id: string; planId: string; status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'; autoRenew: boolean; startedAt: string; renewsAt: string; plan: Plan }
export interface Me { id: string; name: string; email: string; role: Role; createdAt: string; subscriptions: Subscription[] }

export type ResourceType = 'ROOM' | 'DESK';
export interface Location { id: string; name: string; city: string; address: string; _count?: { rooms: number; desks: number } }
export interface Room { id: string; locationId: string; name: string; capacity: number; equipment: Record<string, boolean>; isActive: boolean }
export interface Desk { id: string; locationId: string; code: string; isDedicated: boolean; isActive: boolean }

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export interface Booking {
  id: string; memberId: string; resourceId: string; resourceType: ResourceType; locationId: string;
  startTime: string; endTime: string; status: BookingStatus; cancelReason?: string | null; createdAt: string;
}
export interface BusySlot { startTime: string; endTime: string; status: BookingStatus }
export interface WaitlistEntry { id: string; resourceId: string; resourceType: ResourceType; startTime: string; endTime: string; status: 'WAITING' | 'PROMOTED' | 'EXPIRED'; bookingId?: string | null; createdAt: string }
export interface Invoice { id: string; period: string; amount: number; status: 'PAID' | 'FAILED'; electronicNumber?: string | null; failureReason?: string | null; createdAt: string }
export interface Charge { id: string; bookingId: string; amount: number; reason: string; status: 'APPROVED' | 'REJECTED' | 'VOIDED'; failureReason?: string | null; createdAt: string }
export interface ServiceHealth { status: 'up' | 'down'; httpStatus?: number; latencyMs?: number; error?: string }
export type HealthReport = Record<string, ServiceHealth>;

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

// ---------------------------------------------------------------- sesión
const KEY = 'coworkspace.session';
let session: Session | null = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
})();
const listeners = new Set<(s: Session | null) => void>();

export const getSession = () => session;
export function setSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
  listeners.forEach((fn) => fn(next));
}
export function onSessionChange(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------- peticiones
async function send(path: string, init: RequestInit, withAuth: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (withAuth && session) headers.set('Authorization', `Bearer ${session.accessToken}`);
  try {
    return await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(90_000) });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Si los servicios estaban inactivos, espera un minuto y vuelve a intentar.');
  }
}

let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  if (!session) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await send('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: session!.refreshToken }) }, false);
      if (!res.ok) {
        setSession(null);
        return false;
      }
      const data = await res.json();
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, member: data.member });
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init, true);
  if (res.status === 401 && session && !path.startsWith('/api/auth/')) {
    if (await refreshSession()) res = await send(path, init, true);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw.join('. ') : typeof raw === 'string' ? raw : `Error ${res.status}`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};

export async function login(email: string, password: string) {
  const data = await request<Session & { member: SessionMember }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, member: data.member });
}

export async function register(name: string, email: string, password: string) {
  const data = await request<Session>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, member: data.member });
}

export async function logout() {
  const current = session;
  setSession(null);
  if (current) await send('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) }, false).catch(() => undefined);
}

/** /health/services devuelve { membership: {...}, space: {...}, booking: {...}, billing: {...} }. */
export async function fetchHealth(): Promise<HealthReport> {
  const res = await fetch(`${API_URL}/health/services`, { signal: AbortSignal.timeout(90_000) });
  const data = await res.json();
  return (data.services ?? data) as HealthReport;
}
