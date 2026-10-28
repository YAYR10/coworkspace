import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { AccessLog, ApiError, api, IssuedCredential, Location } from '../api';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { date, time } from '../format';
import { errorText, useLoad } from '../hooks';
import { link } from '../router';

/**
 * Credencial digital de acceso: un QR de corta duración que se renueva solo.
 * Si alguien le toma foto, deja de servir en unos minutos; y si la membresía vence, se revoca.
 */
export function AccessView() {
  const [cred, setCred] = useState<IssuedCredential | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const logs = useLoad(() => api.get<AccessLog[]>('/api/access/logs/me'));
  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const locName = (id: string) => locations.data?.find((l) => l.id === id)?.name ?? 'Sede';

  const issue = useCallback(async () => {
    setError(null);
    try {
      const c = await api.post<IssuedCredential>('/api/access/credentials', { kind: 'QR' });
      setCred(c);
      setQr(await QRCode.toDataURL(c.token, { width: 280, margin: 1, errorCorrectionLevel: 'M' }));
    } catch (e) {
      setCred(null);
      setQr(null);
      setError({ status: e instanceof ApiError ? e.status : 0, message: errorText(e) });
    }
  }, []);

  useEffect(() => {
    void issue();
  }, [issue]);

  // Cuenta regresiva y renovación automática unos segundos antes de vencer
  useEffect(() => {
    if (!cred) return;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(cred.expiresAt).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s <= 5 && document.visibilityState === 'visible') void issue();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cred, issue]);

  const copy = async () => {
    if (!cred) return;
    try {
      await navigator.clipboard.writeText(cred.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el portapapeles puede no estar disponible */
    }
  };

  return (
    <>
      <PageHead title="Mi acceso">Muestra este código en la recepción o acércalo al lector de la puerta de cualquier sede.</PageHead>

      <section className="block access-card">
        {!cred && !error && <Loading label="Generando tu código…" />}
        {error?.status === 403 && (
          <Empty title="Necesitas una membresía vigente">
            Tu credencial de acceso se activa en cuanto tengas un plan. <a href={link('/cuenta/membresia')}>Elegir un plan</a>
          </Empty>
        )}
        {error && error.status !== 403 && (
          <Notice tone="error">
            {error.message} <button className="btn btn-quiet" onClick={() => void issue()}>Reintentar</button>
          </Notice>
        )}
        {cred && qr && (
          <div className="access-qr">
            <img src={qr} width={240} height={240} alt="Código QR de acceso" />
            <div className="access-info">
              <p className="access-state"><span className="dot dot-up" aria-hidden="true" /> Credencial activa</p>
              <p className="access-timer" aria-live="off">
                Se renueva en <strong>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</strong>
              </p>
              <p className="muted">Por seguridad el código cambia cada {Math.round(cred.ttlSeconds / 60) || 1} min y el anterior deja de funcionar.</p>
              <div className="access-actions">
                <button className="btn btn-ghost" onClick={() => void issue()}>Generar otro</button>
                <button className="btn btn-quiet" onClick={() => void copy()}>{copied ? 'Copiado' : 'Copiar código'}</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Mis ingresos</h2>
          <button className="btn btn-quiet" onClick={() => void logs.reload()}>Actualizar</button>
        </div>
        {logs.loading && !logs.data && <Loading />}
        {logs.error && <Notice tone="error">{logs.error}</Notice>}
        {logs.data && logs.data.length === 0 && <Empty title="Aún no registras ingresos">Cada vez que entres a una sede quedará aquí.</Empty>}
        {logs.data && logs.data.length > 0 && (
          <ul className="rows">
            {logs.data.map((l) => (
              <li key={l.id} className="row">
                <div className="row-main">
                  <p className="row-title">{locName(l.locationId)}</p>
                  <p className="row-sub">{date(l.timestamp)}, {time(l.timestamp)}</p>
                </div>
                <span className={`tag ${l.granted ? 'tag-confirmed' : 'tag-cancelled'}`}>{l.granted ? 'Ingreso' : 'Denegado'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
