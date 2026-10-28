import { FormEvent, useEffect, useRef, useState } from 'react';
import { AccessLog, AccessStats, AccessValidation, api, Location } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { date, time } from '../../format';
import { errorText, useLoad } from '../../hooks';

/* Detector nativo de códigos QR (Chrome/Edge/Android). Donde no existe, se pega el código a mano. */
interface Detector { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
declare global {
  interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }
}

/** Recepción / lector de la puerta: valida credenciales en tiempo real contra Access Control. */
export function AccessDeskView() {
  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const [locationId, setLocationId] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<AccessValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const logs = useLoad(() => (locationId ? api.get<AccessLog[]>(`/api/access/logs?locationId=${locationId}`) : Promise.resolve([] as AccessLog[])), [locationId]);
  const stats = useLoad(() => api.get<AccessStats>(`/api/access/stats${locationId ? `?locationId=${locationId}` : ''}`), [locationId]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!locationId && locations.data?.length) setLocationId(locations.data[0].id);
  }, [locations.data, locationId]);

  const validate = async (value: string) => {
    if (!value.trim() || !locationId || busy.current) return;
    busy.current = true;
    setError(null);
    try {
      setResult(await api.post<AccessValidation>('/api/access/validate', { token: value.trim(), locationId }));
      setToken('');
      void logs.reload();
      void stats.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      busy.current = false;
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void validate(token);
  };

  // Cámara + BarcodeDetector: lee el QR del miembro y valida sin tocar nada
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let last = '';
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
        timer = window.setInterval(async () => {
          if (!videoRef.current || busy.current) return;
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const value = codes[0]?.rawValue;
          if (value && value !== last) {
            last = value;
            await validate(value);
          }
        }, 400);
      } catch {
        setError('No se pudo abrir la cámara. Pega el código del miembro en el campo de abajo.');
        setScanning(false);
      }
    })();
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, locationId]);

  const canScan = typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices;
  const s = stats.data?.last24h;

  return (
    <>
      <PageHead title="Control de acceso">Valida en la entrada el QR de los miembros. Se comprueba la credencial y la membresía vigente en el momento.</PageHead>

      <dl className="ledger ledger-3">
        <div className="ledger-item"><dt>Ingresos, últimas 24 h</dt><dd>{s ? s.granted : '–'}</dd><span>credenciales válidas</span></div>
        <div className="ledger-item"><dt>Denegados</dt><dd>{s ? s.denied : '–'}</dd><span>vencidas, revocadas o sin plan</span></div>
        <div className="ledger-item"><dt>Tiempo de validación</dt><dd>{s ? `${s.avgLatencyMs} ms` : '–'}</dd><span>promedio</span></div>
      </dl>

      <section className="block access-desk">
        <label className="field field-inline">
          Sede
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>

        {canScan && (
          <div className="scanner">
            {scanning ? <video ref={videoRef} muted playsInline className="scanner-video" /> : null}
            <button className="btn btn-ghost" onClick={() => setScanning(!scanning)}>{scanning ? 'Detener cámara' : 'Escanear con la cámara'}</button>
          </div>
        )}

        <form className="form form-inline-token" onSubmit={submit}>
          <label className="field field-grow">
            Código del miembro
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="cw1.…" autoComplete="off" />
          </label>
          <button className="btn btn-primary" disabled={!token.trim() || !locationId}>Validar</button>
        </form>

        {error && <Notice tone="error">{error}</Notice>}
        {result && (
          <div className={`gate ${result.granted ? 'gate-ok' : 'gate-bad'}`} role="status">
            <strong>{result.granted ? 'Acceso concedido' : 'Acceso denegado'}</strong>
            <span>{result.granted ? result.memberEmail ?? 'Miembro verificado' : result.reason}</span>
            <small>Validado en {result.latencyMs} ms</small>
          </div>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Bitácora de la sede</h2>
          <button className="btn btn-quiet" onClick={() => void logs.reload()}>Actualizar</button>
        </div>
        {logs.loading && !logs.data && <Loading />}
        {logs.error && <Notice tone="error">{logs.error}</Notice>}
        {logs.data && logs.data.length === 0 && <Empty title="Sin intentos de acceso registrados" />}
        {logs.data && logs.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Miembro</th><th>Resultado</th><th className="num">Tiempo</th></tr></thead>
              <tbody>
                {logs.data.map((l) => (
                  <tr key={l.id}>
                    <td>{date(l.timestamp)}, {time(l.timestamp)}</td>
                    <td className="mono">{l.memberId ? `${l.memberId.slice(0, 8)}…` : '—'}</td>
                    <td><span className={`tag ${l.granted ? 'tag-confirmed' : 'tag-cancelled'}`}>{l.granted ? 'Concedido' : REASON[l.reason] ?? l.reason}</span></td>
                    <td className="num">{l.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const REASON: Record<string, string> = {
  MALFORMED: 'Código no reconocido',
  NOT_FOUND: 'Credencial inexistente',
  BAD_SECRET: 'Falsificada',
  REVOKED: 'Revocada',
  EXPIRED: 'Vencida',
  NO_MEMBERSHIP: 'Sin membresía',
};
