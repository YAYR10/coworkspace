import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, Booking, BusySlot, Desk, Location, Me, ResourceType, Room } from '../api';
import { SagaTracker } from '../components/SagaTracker';
import { OPEN_HOUR, CLOSE_HOUR, Selection, Timeline } from '../components/Timeline';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { atHour, EQUIPMENT, hourLabel, longDay, money, sameDay, startOfDay } from '../format';
import { errorText, useLoad } from '../hooks';

// Tarifas por hora cuando el plan no cubre el recurso (valores por defecto de Billing Service).
const RATE: Record<ResourceType, number> = { ROOM: 50_000, DESK: 15_000 };

type Resource = { id: string; locationId: string; title: string; detail: string };
type Picked = Selection & { resourceId: string; anchored: boolean };
type Outcome =
  | { kind: 'saga'; booking: Booking }
  | { kind: 'conflict'; resource: Resource; sel: Picked; message: string }
  | { kind: 'waitlisted'; resource: Resource }
  | null;

function firstDay() {
  const now = new Date();
  return now.getHours() >= CLOSE_HOUR - 1 ? startOfDay(new Date(now.getTime() + 86_400_000)) : startOfDay(now);
}

export function BookView({ onGoTo }: { onGoTo: (tab: 'reservas' | 'membresia') => void }) {
  const [type, setType] = useState<ResourceType>('ROOM');
  const [day, setDay] = useState<Date>(firstDay);
  const [locationId, setLocationId] = useState('');
  const [minCapacity, setMinCapacity] = useState(1);
  const [projector, setProjector] = useState(false);
  const [busy, setBusy] = useState<Record<string, BusySlot[]>>({});
  const [picked, setPicked] = useState<Picked | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const me = useLoad(() => api.get<Me>('/api/members/me'));
  const resources = useLoad<Resource[]>(async () => {
    if (type === 'ROOM') {
      const q = new URLSearchParams();
      if (locationId) q.set('locationId', locationId);
      if (minCapacity > 1) q.set('minCapacity', String(minCapacity));
      if (projector) q.set('equipment', 'projector');
      const rooms = await api.get<Room[]>(`/api/rooms?${q}`);
      return rooms.map((r) => ({
        id: r.id,
        locationId: r.locationId,
        title: r.name,
        detail: [`${r.capacity} personas`, ...Object.entries(r.equipment ?? {}).filter(([, v]) => v).map(([k]) => EQUIPMENT[k] ?? k)].join(', '),
      }));
    }
    const desks = await api.get<Desk[]>(`/api/desks${locationId ? `?locationId=${locationId}` : ''}`);
    return desks.map((d) => ({ id: d.id, locationId: d.locationId, title: `Puesto ${d.code}`, detail: d.isDedicated ? 'Escritorio dedicado' : 'Puesto flexible' }));
  }, [type, locationId, minCapacity, projector]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOfDay(new Date(firstDay().getTime() + i * 86_400_000))), []);
  const locName = useMemo(() => Object.fromEntries((locations.data ?? []).map((l) => [l.id, `${l.name}, ${l.city}`])), [locations.data]);
  const plan = me.data?.subscriptions?.[0]?.plan;
  const covered = !!plan && plan.resourceAccess.includes(type);

  const loadBusy = useCallback(async () => {
    const list = resources.data ?? [];
    const from = atHour(day, 0).toISOString();
    const to = atHour(day, 24).toISOString();
    const entries = await Promise.all(
      list.map(async (r) => {
        try {
          const a = await api.get<{ busy: BusySlot[] }>(`/api/bookings/availability?resourceId=${r.id}&from=${from}&to=${to}`);
          return [r.id, a.busy] as const;
        } catch {
          return [r.id, []] as const;
        }
      }),
    );
    setBusy(Object.fromEntries(entries));
  }, [resources.data, day]);

  useEffect(() => {
    void loadBusy();
  }, [loadBusy]);

  useEffect(() => {
    setPicked(null);
  }, [type, day, locationId, minCapacity, projector]);

  const pick = (resourceId: string, h: number) => {
    setOutcome(null);
    setError(null);
    if (picked && picked.resourceId === resourceId && picked.anchored && h >= picked.start) {
      const slots = busy[resourceId] ?? [];
      const s = atHour(day, picked.start).getTime();
      const e = atHour(day, h + 1).getTime();
      const clash = slots.some((b) => new Date(b.startTime).getTime() < e && new Date(b.endTime).getTime() > s);
      if (!clash && h + 1 - picked.start <= 12) {
        setPicked({ ...picked, end: h + 1, anchored: false });
        return;
      }
    }
    setPicked({ resourceId, start: h, end: h + 1, anchored: true });
  };

  const selectedResource = resources.data?.find((r) => r.id === picked?.resourceId);
  const hours = picked ? picked.end - picked.start : 0;

  const book = async () => {
    if (!picked || !selectedResource) return;
    setSending(true);
    setError(null);
    const body = { resourceType: type, resourceId: picked.resourceId, startTime: atHour(day, picked.start).toISOString(), endTime: atHour(day, picked.end).toISOString() };
    try {
      const booking = await api.post<Booking>('/api/bookings', body);
      setOutcome({ kind: 'saga', booking });
      setPicked(null);
      void loadBusy();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setOutcome({ kind: 'conflict', resource: selectedResource, sel: picked, message: e.message });
      else setError(errorText(e));
    } finally {
      setSending(false);
    }
  };

  const joinWaitlist = async (resource: Resource, sel: Picked) => {
    try {
      await api.post('/api/bookings/waitlist', { resourceType: type, resourceId: resource.id, startTime: atHour(day, sel.start).toISOString(), endTime: atHour(day, sel.end).toISOString() });
      setOutcome({ kind: 'waitlisted', resource });
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHead title="Reservar">Elige el día, toca la hora de inicio y luego la hora final en la franja del espacio que quieras.</PageHead>

      <div className="days" role="radiogroup" aria-label="Día">
        {days.map((d) => (
          <button key={d.toISOString()} role="radio" aria-checked={sameDay(d, day)} className="day" onClick={() => setDay(d)}>
            <span className="day-name">{sameDay(d, new Date()) ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
            <span className="day-num">{d.getDate()}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <div className="switch" role="tablist" aria-label="Tipo de espacio">
          <button role="tab" aria-selected={type === 'ROOM'} onClick={() => setType('ROOM')}>Salas</button>
          <button role="tab" aria-selected={type === 'DESK'} onClick={() => setType('DESK')}>Puestos</button>
        </div>
        <label className="field field-inline">
          <span>Sede</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Todas</option>
            {locations.data?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}, {l.city}</option>
            ))}
          </select>
        </label>
        {type === 'ROOM' && (
          <>
            <label className="field field-inline">
              <span>Personas</span>
              <input type="number" min={1} max={50} value={minCapacity} onChange={(e) => setMinCapacity(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="check">
              <input type="checkbox" checked={projector} onChange={(e) => setProjector(e.target.checked)} />
              Con proyector
            </label>
          </>
        )}
      </div>

      <p className="day-title">{longDay(day)}</p>

      {resources.loading && <Loading label="Buscando espacios…" />}
      {resources.error && <Notice tone="error">{resources.error}</Notice>}
      {resources.data && resources.data.length === 0 && (
        <Empty title={type === 'ROOM' ? 'No hay salas con esos filtros' : 'No hay puestos en esta sede'}>
          Quita algún filtro o elige otra sede. Si no hay sedes creadas, un administrador puede crearlas en Administrar.
        </Empty>
      )}

      <ul className="resources">
        {resources.data?.map((r) => (
          <li key={r.id} className={`resource${picked?.resourceId === r.id ? ' is-selected' : ''}`}>
            <div className="resource-head">
              <h2>{r.title}</h2>
              <p>{r.detail}</p>
              <p className="resource-loc">{locName[r.locationId] ?? ''}</p>
            </div>
            <Timeline
              day={day}
              busy={busy[r.id] ?? []}
              selection={picked?.resourceId === r.id ? picked : null}
              onPick={(h) => pick(r.id, h)}
              label={`Disponibilidad de ${r.title}`}
            />
          </li>
        ))}
      </ul>

      {resources.data && resources.data.length > 0 && (
        <p className="legend">
          <span><i className="lg lg-free" />Libre</span>
          <span><i className="lg lg-busy" />Reservado</span>
          <span><i className="lg lg-pending" />Pendiente de cobro</span>
          <span><i className="lg lg-picked" />Tu selección</span>
          <span className="legend-hours">Horario de {hourLabel(OPEN_HOUR)} a {hourLabel(CLOSE_HOUR)}</span>
        </p>
      )}

      {picked && selectedResource && (
        <aside className="confirm" aria-label="Confirmar reserva">
          <div>
            <p className="confirm-what">{selectedResource.title}, de {hourLabel(picked.start)} a {hourLabel(picked.end)}</p>
            <p className="confirm-cost">
              {covered
                ? `Incluido en tu plan ${plan!.name}.`
                : `${plan ? 'Tu plan no incluye este espacio' : 'Sin membresía activa'}: cobro estimado de ${money(RATE[type] * hours)} (${hours} h).`}
              {picked.anchored && ' Toca otra hora para extender la reserva.'}
            </p>
            {error && <Notice tone="error">{error}</Notice>}
          </div>
          <div className="confirm-actions">
            <button className="btn btn-quiet" onClick={() => setPicked(null)}>Quitar</button>
            <button className="btn btn-primary" disabled={sending} onClick={book}>
              {sending ? 'Reservando…' : `Reservar ${hours} h`}
            </button>
          </div>
        </aside>
      )}

      {outcome?.kind === 'saga' && (
        <section className="outcome" aria-label="Estado de la reserva">
          <h2>Estado de tu reserva</h2>
          <SagaTracker booking={outcome.booking} onDone={loadBusy} />
          <button className="btn btn-ghost" onClick={() => onGoTo('reservas')}>Ver mis reservas</button>
        </section>
      )}
      {outcome?.kind === 'conflict' && (
        <section className="outcome" aria-label="Horario ocupado">
          <Notice tone="error">{outcome.message}</Notice>
          <p>Alguien más tomó ese horario justo antes. Si se libera, te lo asignamos automáticamente.</p>
          <button className="btn btn-primary" onClick={() => void joinWaitlist(outcome.resource, outcome.sel)}>Entrar a la lista de espera</button>
        </section>
      )}
      {outcome?.kind === 'waitlisted' && (
        <section className="outcome">
          <Notice tone="ok">Estás en la lista de espera de {outcome.resource.title}. Si el horario se libera, la reserva se crea a tu nombre.</Notice>
        </section>
      )}
      {!plan && me.data && (
        <p className="hint">
          Sin membresía, cada reserva tiene cobro por hora.{' '}
          <button className="link" onClick={() => onGoTo('membresia')}>Ver planes</button>
        </p>
      )}
    </>
  );
}
