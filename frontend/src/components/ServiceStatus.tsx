import { useEffect, useRef, useState } from 'react';
import { fetchHealth, HealthReport } from '../api';

const NAMES: Record<string, string> = {
  membership: 'Membresías',
  space: 'Espacios',
  booking: 'Reservas',
  billing: 'Facturación',
};
const ORDER = ['membership', 'space', 'booking', 'billing'];

export const allUp = (r: HealthReport | null) => !!r && ORDER.every((k) => r[k]?.status === 'up');

/** Pantalla inicial: en el plan gratuito de Render los servicios se duermen y tardan ~1 min en despertar. */
export function WakeUp({ onReady }: { onReady: () => void }) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [gatewayDown, setGatewayDown] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let alive = true;
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    (async () => {
      while (alive) {
        try {
          const r = await fetchHealth();
          if (!alive) return;
          setGatewayDown(false);
          setReport(r);
          if (allUp(r)) {
            onReady();
            return;
          }
        } catch {
          if (alive) setGatewayDown(true);
        }
        await new Promise((res) => setTimeout(res, 3000));
      }
    })();
    return () => {
      alive = false;
      clearInterval(tick);
    };
  }, [onReady]);

  return (
    <main className="wake">
      <div className="wake-inner">
        <Brand />
        <h1 className="wake-title">Encendiendo las sedes</h1>
        <p className="wake-text">
          Los servicios se apagan cuando nadie los usa. Al entrar se activan de nuevo; esto puede tardar hasta un minuto.
        </p>
        <ul className="wake-list">
          <li className={gatewayDown || !report ? 'is-waiting' : 'is-up'}>
            <span className="dot" aria-hidden="true" />
            Puerta de entrada (API Gateway)
          </li>
          {ORDER.map((k) => (
            <li key={k} className={report?.[k]?.status === 'up' ? 'is-up' : 'is-waiting'}>
              <span className="dot" aria-hidden="true" />
              {NAMES[k]}
            </li>
          ))}
        </ul>
        <p className="wake-time" aria-live="polite">{elapsed} s</p>
        {elapsed >= 25 && (
          <button className="btn btn-ghost" onClick={onReady}>
            Entrar sin esperar
          </button>
        )}
      </div>
    </main>
  );
}

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

  const up = ORDER.filter((k) => report?.[k]?.status === 'up').length;
  return (
    <div className="status" ref={ref}>
      <button className="status-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="status-dots" aria-hidden="true">
          {ORDER.map((k) => (
            <i key={k} className={report?.[k]?.status === 'up' ? 'on' : ''} />
          ))}
        </span>
        {up}/4<span className="status-word"> servicios</span>
      </button>
      {open && (
        <div className="status-pop">
          {ORDER.map((k) => (
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
