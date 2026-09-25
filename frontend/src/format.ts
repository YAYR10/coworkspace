const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const money = (n: number) => cop.format(n);

const dayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
const dateFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export const longDay = (d: Date | string) => dayFmt.format(new Date(d));
export const shortDay = (d: Date | string) => shortDayFmt.format(new Date(d));
export const time = (d: Date | string) => timeFmt.format(new Date(d));
export const date = (d: Date | string) => dateFmt.format(new Date(d));
export const hourLabel = (h: number) => (h === 12 ? '12 m' : h > 12 ? `${h - 12} pm` : `${h} am`);

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function atHour(day: Date, hour: number) {
  const x = startOfDay(day);
  x.setHours(hour);
  return x;
}
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const EQUIPMENT: Record<string, string> = {
  projector: 'Proyector',
  whiteboard: 'Tablero',
  tv: 'Pantalla',
  videoconference: 'Videoconferencia',
};

export const CANCEL_REASONS: Record<string, string> = {
  PAYMENT_REJECTED: 'El cobro fue rechazado',
  CANCELLED_BY_MEMBER: 'La cancelaste tú',
  SAGA_TIMEOUT: 'Facturación no respondió a tiempo',
};
export const cancelReason = (r?: string | null) => (r ? CANCEL_REASONS[r] ?? r.replace(/_/g, ' ').toLowerCase() : 'Cancelada');
