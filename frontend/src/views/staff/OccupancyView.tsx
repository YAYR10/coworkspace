import { useMemo, useState } from 'react';
import { api, Booking, BookingStatus, Desk, Location, MemberRow, Room } from '../../api';
import { Empty, Loading, Notice, PageHead, StatusTag } from '../../components/ui';
import { cancelReason, shortDay, time } from '../../format';
import { errorText, useLoad } from '../../hooks';

type Range = 'today' | 'week' | 'all';
const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Próximos 7 días' },
  { id: 'all', label: 'Todas' },
];

function rangeQuery(r: Range) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (r === 'all') return '';
  const end = new Date(start.getTime() + (r === 'today' ? 1 : 7) * 86_400_000);
  return `from=${start.toISOString()}&to=${end.toISOString()}`;
}

/** Ocupación de las sedes: coordinador y administrador. El administrador ve además el nombre del miembro. */
export function OccupancyView({ isAdmin }: { isAdmin: boolean }) {
  const [range, setRange] = useState<Range>('week');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState<'' | BookingStatus>('');
  const [error, setError] = useState<string | null>(null);

  const bookings = useLoad(() => {
    const q = [rangeQuery(range), locationId && `locationId=${locationId}`, status && `status=${status}`].filter(Boolean).join('&');
    return api.get<Booking[]>(`/api/bookings${q ? `?${q}` : ''}`);
  }, [range, locationId, status]);

  const catalog = useLoad(async () => {
    const locations = await api.get<Location[]>('/api/locations?all=true');
    const details = await Promise.all(
      locations.map((l) => api.get<Location & { rooms: Room[]; desks: Desk[] }>(`/api/locations/${l.id}`).catch(() => null)),
    );
    const resources: Record<string, string> = {};
    details.forEach((d) => {
      d?.rooms.forEach((r) => (resources[r.id] = r.name));
      d?.desks.forEach((k) => (resources[k.id] = `Puesto ${k.code}`));
    });
    return { locations, resources, locName: Object.fromEntries(locations.map((l) => [l.id, `${l.name}, ${l.city}`])) as Record<string, string> };
  });

  const members = useLoad(async () => (isAdmin ? api.get<MemberRow[]>('/api/members') : []), [isAdmin]);
  const memberName = useMemo(() => Object.fromEntries((members.data ?? []).map((m) => [m.id, m.name])) as Record<string, string>, [members.data]);

  const list = [...(bookings.data ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const count = (s: BookingStatus) => list.filter((b) => b.status === s).length;

  const cancel = async (b: Booking) => {
    if (!window.confirm('¿Cancelar esta reserva? El miembro la verá como cancelada por el equipo de la sede.')) return;
    setError(null);
    try {
      await api.patch(`/api/bookings/${b.id}/cancel`);
      await bookings.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHead title="Ocupación">Reservas de todas las sedes. Puedes cancelar una reserva si la sala o el puesto no estarán disponibles.</PageHead>
      {error && <Notice tone="error">{error}</Notice>}

      <div className="toolbar">
        <div className="switch" role="tablist" aria-label="Periodo">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
        <label className="field field-inline">
          <span>Sede</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Todas</option>
            {catalog.data?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.city}</option>)}
          </select>
        </label>
        <label className="field field-inline">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as '' | BookingStatus)}>
            <option value="">Todos</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="PENDING">Pendientes</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </label>
      </div>

      {bookings.data && (
        <p className="figures">
          <span><strong>{list.length}</strong> {list.length === 1 ? 'reserva' : 'reservas'}</span>
          <span><strong>{count('CONFIRMED')}</strong> {count('CONFIRMED') === 1 ? 'confirmada' : 'confirmadas'}</span>
          <span><strong>{count('PENDING')}</strong> {count('PENDING') === 1 ? 'pendiente' : 'pendientes'}</span>
          <span><strong>{count('CANCELLED')}</strong> {count('CANCELLED') === 1 ? 'cancelada' : 'canceladas'}</span>
        </p>
      )}

      {bookings.loading && <Loading />}
      {bookings.error && <Notice tone="error">{bookings.error}</Notice>}
      {bookings.data && list.length === 0 && <Empty title="No hay reservas con estos filtros" />}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Horario</th><th>Espacio</th><th>Sede</th><th>Miembro</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td className="cap">{shortDay(b.startTime)}</td>
                  <td className="nowrap">{time(b.startTime)} a {time(b.endTime)}</td>
                  <td>{catalog.data?.resources[b.resourceId] ?? (b.resourceType === 'ROOM' ? 'Sala' : 'Puesto')}</td>
                  <td>{catalog.data?.locName[b.locationId] ?? '—'}</td>
                  <td>{memberName[b.memberId] ?? <span className="mono-id">{b.memberId.slice(0, 8)}</span>}</td>
                  <td>
                    <StatusTag status={b.status} />
                    {b.status === 'CANCELLED' && <span className="cell-note">{cancelReason(b.cancelReason)}</span>}
                  </td>
                  <td className="num">
                    {b.status !== 'CANCELLED' && new Date(b.endTime).getTime() > Date.now() && (
                      <button className="btn btn-quiet" onClick={() => void cancel(b)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
