import { useEffect, useRef, useState } from 'react';
import { fetchHealth, HealthReport } from '../api';

const NAMES: Record<string, string> = {
  membership: 'Membresías',
  space: 'Espacios',
  booking: 'Reservas',
  billing: 'Facturación',
  notification: 'Notificaciones',
  access: 'Control de acceso',
  community: 'Comunidad',
  analytics: 'Analítica',
};
/** Servicios sin los que la app no funciona. Notificaciones es asíncrono: si tarda, la app igual abre. */
const CORE = ['membership', 'space', 'booking', 'billing'];
const ORDER = [...CORE, 'notification', 'access', 'community', 'analytics'];

export const allUp = (r: HealthReport | null) => !!r && CORE.every((k) => r[k]?.status === 'up');

/** Indicador del encabezado; vuelve a consultar cada minuto (y así mantiene despiertos los servicios). */
export function StatusChip() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => fetchHealth().then((r) => alive && setReport(r)).catch(() => alive && setReport(null));
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Se muestran los servicios que el gateway conoce (un despliegue anterior puede no tener los nuevos)
  const shown = report ? ORDER.filter((k) => CORE.includes(k) || report[k]) : ORDER;
  const up = shown.filter((k) => report?.[k]?.status === 'up').length;
  return (
    <div className="status" ref={ref}>
      <button className="status-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="status-dots" aria-hidden="true">
          {shown.map((k) => (
            <i key={k} className={report?.[k]?.status === 'up' ? 'on' : ''} />
          ))}
        </span>
        {up}/{shown.length}<span className="status-word"> servicios</span>
      </button>
      {open && (
        <div className="status-pop">
          {shown.map((k) => (
            <p key={k}>
              <span className={`dot ${report?.[k]?.status === 'up' ? 'dot-up' : 'dot-down'}`} aria-hidden="true" />
              <span>{NAMES[k]}</span>
              <span className="status-ms">{report?.[k]?.status === 'up' ? `${report[k].latencyMs ?? '–'} ms` : 'inactivo'}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="currentColor" />
        <rect x="6" y="13" width="20" height="6" rx="2" fill="#3B4A60" />
        <rect x="12" y="13" width="9" height="6" rx="2" fill="#F2B705" />
      </svg>
      CoworkSpace
    </span>
  );
}
