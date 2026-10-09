import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, Booking, BusySlot, Desk, Location, Me, ResourceType, Room } from '../api';
import { useAuth } from '../components/Auth';
import { directionsUrl, GoogleMap, mapQuery, mapsUrl } from '../components/GoogleMap';
import { CLOSE_HOUR, HourPicker, nextRange, Range } from '../components/HourPicker';
import { ArrowLeft, DeskIcon, PinIcon, RoomIcon, ServiceIcon } from '../components/icons';
import { Photo } from '../components/ListingCard';
import { SagaTracker } from '../components/SagaTracker';
import { Loading, Notice } from '../components/ui';
import { atHour, capitalize, EQUIPMENT, HOURLY_RATE, hourLabel, longDay, money, plural, sameDay, startOfDay } from '../format';
import { errorText, useLoad, useSession } from '../hooks';
import { link, navigate } from '../router';

type Detail = Location & { rooms: Room[]; desks: Desk[] };
interface Space { id: string; type: ResourceType; name: string; detail: string }
type Outcome = { kind: 'saga'; booking: Booking } | { kind: 'conflict'; message: string } | { kind: 'waitlisted' } | null;

function firstDay() {
  const now = new Date();
  return now.getHours() >= CLOSE_HOUR - 1 ? startOfDay(new Date(now.getTime() + 86_400_000)) : startOfDay(now);
}

export function SiteView({ id }: { id: string }) {
  const session = useSession();
  const { requireLogin } = useAuth();
  const site = useLoad(() => api.get<Detail>(`/api/locations/${id}`), [id]);
  const me = useLoad(async () => (session ? api.get<Me>('/api/members/me') : null), [session?.member.id]);

  const spaces = useMemo<Space[]>(() => {
    const d = site.data;
    if (!d) return [];
    return [
      ...d.rooms.map((r) => ({
        id: r.id,
        type: 'ROOM' as const,
        name: r.name,
        detail: [`Hasta ${r.capacity} personas`, ...Object.entries(r.equipment ?? {}).filter(([, v]) => v).map(([k]) => EQUIPMENT[k] ?? k)].join(' · '),
      })),
      ...d.desks.map((k) => ({ id: k.id, type: 'DESK' as const, name: `Puesto ${k.code}`, detail: k.isDedicated ? 'Escritorio dedicado' : 'Puesto flexible' })),
    ];
  }, [site.data]);

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [day, setDay] = useState<Date>(firstDay);
  const [range, setRange] = useState<Range | null>(null);
  const [anchored, setAnchored] = useState(false);
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const card = useRef<HTMLElement>(null);
  const [cardVisible, setCardVisible] = useState(false);
  useEffect(() => {
    if (!card.current) return;
    const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(card.current);
    return () => io.disconnect();
  });

  useEffect(() => {
    if (!spaceId && spaces.length) setSpaceId(spaces[0].id);
  }, [spaces, spaceId]);
  const space = spaces.find((s) => s.id === spaceId) ?? null;

  const loadBusy = useCallback(async () => {
    if (!space) return;
    try {
      const a = await api.get<{ busy: BusySlot[] }>(
        `/api/bookings/availability?resourceId=${space.id}&from=${atHour(day, 0).toISOString()}&to=${atHour(day, 24).toISOString()}`,
      );
      setBusy(a.busy);
    } catch {
      setBusy([]);
    }
  }, [space, day]);
  useEffect(() => {
    void loadBusy();
  }, [loadBusy]);
  useEffect(() => {
    setRange(null);
    setAnchored(false);
    setError(null);
  }, [spaceId, day]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => startOfDay(new Date(firstDay().getTime() + i * 86_400_000))), []);
  const plan = me.data?.subscriptions?.[0]?.plan;
  const covered = !!plan && !!space && plan.resourceAccess.includes(space.type);
  const hours = range ? range.end - range.start : 0;
  const rate = space ? HOURLY_RATE[space.type] : 0;

  const choose = (s: Space) => {
    setSpaceId(s.id);
    setOutcome(null);
    if (window.matchMedia('(max-width: 900px)').matches) card.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pick = (h: number) => {
    setOutcome(null);
    setError(null);
    const next = nextRange(range, h, day, busy, anchored);
    const extended = !!range && anchored && next.start === range.start && next.end > range.start + 1;
    setAnchored(!extended);
    setRange(next);
  };

  const book = async () => {
    if (!space || !range) return;
    setSending(true);
    setError(null);
    try {
      const booking = await api.post<Booking>('/api/bookings', {
        resourceType: space.type,
        resourceId: space.id,
        startTime: atHour(day, range.start).toISOString(),
        endTime: atHour(day, range.end).toISOString(),
      });
      setOutcome({ kind: 'saga', booking });
      void loadBusy();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setOutcome({ kind: 'conflict', message: e.message });
      else setError(errorText(e));
    } finally {
      setSending(false);
    }
  };

  const reserve = () =>
    requireLogin(`Para reservar ${space?.name} necesitas una cuenta. Al terminar seguimos con tu reserva.`, () => void book());

  const joinWaitlist = async () => {
    if (!space || !range) return;
    try {
      await api.post('/api/bookings/waitlist', {
        resourceType: space.type,
        resourceId: space.id,
        startTime: atHour(day, range.start).toISOString(),
        endTime: atHour(day, range.end).toISOString(),
      });
      setOutcome({ kind: 'waitlisted' });
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (site.loading && !site.data) return <div className="container page-pad"><Loading label="Cargando la sede…" /></div>;
  if (site.error || !site.data)
    return (
      <div className="container page-pad">
        <Notice tone="error">{site.error ?? 'No encontramos esta sede.'}</Notice>
        <a className="back-link" href={link('/')}><ArrowLeft size={18} /> Volver a las sedes</a>
      </div>
    );
  const s = site.data;
  const rooms = spaces.filter((x) => x.type === 'ROOM');
  const desks = spaces.filter((x) => x.type === 'DESK');

  const spaceRow = (x: Space) => {
    const on = x.id === spaceId;
    return (
      <li key={x.id}>
        <button className={`space${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => choose(x)}>
          <span className="space-icon">{x.type === 'ROOM' ? <RoomIcon /> : <DeskIcon />}</span>
          <span className="space-main">
            <span className="space-name">{x.name}</span>
            <span className="space-detail">{x.detail}</span>
          </span>
          <span className="space-price">
            {plan?.resourceAccess.includes(x.type) ? 'En tu plan' : <>{money(HOURLY_RATE[x.type])}<small>/hora</small></>}
          </span>
          <span className="space-cta">{on ? 'Elegido' : 'Elegir'}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="container site">
      <a className="back-link" href={link('/')}><ArrowLeft size={18} /> Todas las sedes</a>

      <header className="site-head">
        <h1 className="site-title">{s.name}</h1>
        <p className="site-address">
          <PinIcon size={18} /> {s.address}, {s.city}, {s.country}
          <a href={mapsUrl(s)} target="_blank" rel="noreferrer">Ver en Google Maps</a>
        </p>
      </header>

      <Photo src={s.photoUrl} alt={`Foto de ${s.name}`} className="site-photo" />

      <div className="site-layout">
        <div className="site-main">
          <section className="site-section">
            <p className="site-facts">
              {[rooms.length && plural(rooms.length, 'sala de reunión', 'salas de reunión'), desks.length && plural(desks.length, 'puesto de trabajo', 'puestos de trabajo')]
                .filter(Boolean)
                .join(' · ') || 'Aún no hay espacios publicados en esta sede'}
            </p>
            {s.description && <p className="site-desc">{s.description}</p>}
          </section>

          {s.services.length > 0 && (
            <section className="site-section">
              <h2>Lo que ofrece esta sede</h2>
              <ul className="services-grid">
                {s.services.map((sv) => (
                  <li key={sv}><ServiceIcon name={sv} size={22} /> {sv}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="site-section">
            <h2>Elige tu espacio</h2>
            {spaces.length === 0 && <p className="hint">Esta sede todavía no tiene salas ni puestos disponibles.</p>}
            {rooms.length > 0 && (
              <>
                <h3 className="space-group">Salas de reunión</h3>
                <ul className="spaces">{rooms.map(spaceRow)}</ul>
              </>
            )}
            {desks.length > 0 && (
              <>
                <h3 className="space-group">Puestos de trabajo</h3>
                <ul className="spaces">{desks.map(spaceRow)}</ul>
              </>
            )}
          </section>

          <section className="site-section">
            <h2>Ubicación</h2>
            <GoogleMap query={mapQuery(s)} title={`Mapa de ${s.name}`} className="site-map" />
            <div className="map-actions">
              <p>{s.address}, {s.city}, {s.country}</p>
              <a className="btn btn-ghost" href={directionsUrl(s)} target="_blank" rel="noreferrer">Cómo llegar</a>
            </div>
          </section>
        </div>

        <aside className="book-card" ref={card} aria-label="Reservar">
          {!space ? (
            <p className="hint">Elige una sala o un puesto para ver los horarios.</p>
          ) : (
            <>
              <div className="book-head">
                <p className="book-space">{space.name}</p>
                <p className="book-rate">
                  {covered ? <>Incluido en tu plan <strong>{plan!.name}</strong></> : <><strong>{money(rate)}</strong> por hora</>}
                </p>
              </div>

              <p className="book-label">Día</p>
              <div className="day-strip" role="radiogroup" aria-label="Día">
                {days.map((d) => (
                  <button key={d.toISOString()} role="radio" aria-checked={sameDay(d, day)} className="day-chip" onClick={() => setDay(d)}>
                    <span>{sameDay(d, new Date()) ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
                    <strong>{d.getDate()}</strong>
                  </button>
                ))}
              </div>

              <p className="book-label">
                Horario <span className="book-label-hint">{range && anchored ? 'Toca otra hora para extender' : 'Toca la hora de inicio'}</span>
              </p>
              <HourPicker day={day} busy={busy} range={range} onPick={pick} />
              <p className="hours-legend"><i className="lg lg-free" /> Libre <i className="lg lg-taken" /> Ocupado <i className="lg lg-on" /> Tu selección</p>

              {range && (
                <dl className="book-summary">
                  <div><dt className="cap">{capitalize(longDay(day))}</dt><dd>{hourLabel(range.start)} – {hourLabel(range.end)}</dd></div>
                  <div>
                    <dt>{hours} h × {covered ? 'plan' : money(rate)}</dt>
                    <dd>{covered ? 'Sin costo' : money(rate * hours)}</dd>
                  </div>
                </dl>
              )}
              {!session && range && <p className="book-note">Si tienes un plan que incluye este espacio, no pagas adicional.</p>}
              {error && <Notice tone="error">{error}</Notice>}

              {outcome?.kind !== 'saga' && (
                <button className="btn btn-accent btn-block btn-lg" disabled={!range || sending} onClick={reserve}>
                  {sending ? 'Reservando…' : range ? `Reservar ${hours} h` : 'Elige un horario'}
                </button>
              )}

              {outcome?.kind === 'saga' && (
                <div className="book-outcome">
                  <SagaTracker booking={outcome.booking} onDone={loadBusy} />
                  <button className="btn btn-ghost btn-block" onClick={() => navigate('/cuenta/reservas')}>Ver mis reservas</button>
                  <button className="link" onClick={() => { setOutcome(null); setRange(null); }}>Hacer otra reserva</button>
                </div>
              )}
              {outcome?.kind === 'conflict' && (
                <div className="book-outcome">
                  <Notice tone="error">{outcome.message}</Notice>
                  <p className="hint">Alguien tomó ese horario justo antes. Si se libera, te lo asignamos automáticamente.</p>
                  <button className="btn btn-ghost btn-block" onClick={() => void joinWaitlist()}>Entrar a la lista de espera</button>
                </div>
              )}
              {outcome?.kind === 'waitlisted' && <Notice tone="ok">Estás en la lista de espera. Si el horario se libera, la reserva se crea a tu nombre y te avisamos.</Notice>}
            </>
          )}
        </aside>
      </div>

      {space && !cardVisible && (
        <div className="mobile-book-bar">
          <span>
            <strong>{space.name}</strong>
            <small>{covered ? 'Incluido en tu plan' : `${money(rate)} por hora`}</small>
          </span>
          <button className="btn btn-accent" onClick={() => card.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {range ? `Reservar ${hours} h` : 'Ver horarios'}
          </button>
        </div>
      )}
    </div>
  );
}
