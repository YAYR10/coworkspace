import { useMemo, useState } from 'react';
import { api, Booking, Desk, Location, Room, WaitlistEntry } from '../api';
import { Empty, Loading, Notice, PageHead, StatusTag } from '../components/ui';
import { cancelReason, longDay, time } from '../format';
import { errorText, useLoad } from '../hooks';

export function BookingsView({ onGoTo }: { onGoTo: (tab: 'reservar') => void }) {
  const bookings = useLoad(() => api.get<Booking[]>('/api/bookings/me'));
  const waitlist = useLoad(() => api.get<WaitlistEntry[]>('/api/bookings/waitlist/me'));
  const names = useLoad(async () => {
    const [rooms, desks, locations] = await Promise.all([
      api.get<Room[]>('/api/rooms'),
      api.get<Desk[]>('/api/desks'),
      api.get<Location[]>('/api/locations'),
    ]);
    const loc = Object.fromEntries(locations.map((l) => [l.id, l.name]));
    return {
      resource: Object.fromEntries([...rooms.map((r) => [r.id, r.name]), ...desks.map((d) => [d.id, `Puesto ${d.code}`])]) as Record<string, string>,
      loc: loc as Record<string, string>,
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const list = bookings.data ?? [];
    return {
      upcoming: list.filter((b) => new Date(b.endTime).getTime() > now).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      past: list.filter((b) => new Date(b.endTime).getTime() <= now),
    };
  }, [bookings.data, now]);

  const nameOf = (b: { resourceId: string; resourceType: string }) =>
    names.data?.resource[b.resourceId] ?? (b.resourceType === 'ROOM' ? 'Sala' : 'Puesto');

  const cancel = async (b: Booking) => {
    if (!window.confirm(`¿Cancelar la reserva de ${nameOf(b)} del ${longDay(b.startTime)}?`)) return;
    setCancelling(b.id);
    setError(null);
    try {
      await api.patch(`/api/bookings/${b.id}/cancel`);
      await bookings.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setCancelling(null);
    }
  };

  const row = (b: Booking, canCancel: boolean) => (
    <li key={b.id} className="row">
      <div className="row-main">
        <p className="row-title">{nameOf(b)}</p>
        <p className="row-sub">
          {longDay(b.startTime)}, {time(b.startTime)} a {time(b.endTime)}
          {names.data?.loc[b.locationId] ? `, ${names.data.loc[b.locationId]}` : ''}
        </p>
        {b.status === 'CANCELLED' && <p className="row-note">{cancelReason(b.cancelReason)}</p>}
      </div>
      <StatusTag status={b.status} />
      {canCancel && b.status !== 'CANCELLED' && (
        <button className="btn btn-quiet" disabled={cancelling === b.id} onClick={() => void cancel(b)}>
          {cancelling === b.id ? 'Cancelando…' : 'Cancelar'}
        </button>
      )}
    </li>
  );

  const waiting = (waitlist.data ?? []).filter((w) => w.status === 'WAITING');

  return (
    <>
      <PageHead title="Mis reservas">
        Una reserva queda pendiente mientras Facturación revisa el cobro; luego pasa a confirmada o se cancela sola si el pago no se aprueba.
      </PageHead>
      {error && <Notice tone="error">{error}</Notice>}
      {bookings.loading && <Loading />}
      {bookings.error && <Notice tone="error">{bookings.error}</Notice>}

      {bookings.data && (
        <section className="block">
          <div className="block-head">
            <h2>Próximas</h2>
            <button className="btn btn-quiet" onClick={() => void bookings.reload()}>Actualizar</button>
          </div>
          {upcoming.length === 0 ? (
            <Empty title="No tienes reservas próximas">
              <button className="btn btn-primary" onClick={() => onGoTo('reservar')}>Reservar un espacio</button>
            </Empty>
          ) : (
            <ul className="rows">{upcoming.map((b) => row(b, true))}</ul>
          )}
        </section>
      )}

      {waiting.length > 0 && (
        <section className="block">
          <h2>En lista de espera</h2>
          <ul className="rows">
            {waiting.map((w) => (
              <li key={w.id} className="row">
                <div className="row-main">
                  <p className="row-title">{nameOf(w)}</p>
                  <p className="row-sub">{longDay(w.startTime)}, {time(w.startTime)} a {time(w.endTime)}</p>
                </div>
                <span className="tag tag-waiting">Esperando</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="block">
          <h2>Anteriores</h2>
          <ul className="rows rows-muted">{past.map((b) => row(b, false))}</ul>
        </section>
      )}
    </>
  );
}
