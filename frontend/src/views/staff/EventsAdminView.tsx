import { FormEvent, useState } from 'react';
import { api, CommunityEvent, Location } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { longDay, time } from '../../format';
import { errorText, useLoad } from '../../hooks';

interface Attendee { memberId: string; displayName: string; since: string }

/** Coordinación: publica y administra los eventos de networking de cada sede. */
export function EventsAdminView() {
  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const events = useLoad(() => api.get<CommunityEvent[]>('/api/community/events'));
  const [form, setForm] = useState({ locationId: '', title: '', description: '', date: '', hour: '18:00', durationMinutes: '90', capacity: '30' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const locName = (id: string) => locations.data?.find((l) => l.id === id)?.name ?? 'Sede';
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const scheduledAt = new Date(`${form.date}T${form.hour}:00`).toISOString();
      await api.post('/api/community/events', {
        locationId: form.locationId || locations.data?.[0]?.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        capacity: Number(form.capacity),
      });
      setForm({ ...form, title: '', description: '' });
      setMsg({ tone: 'ok', text: 'Evento publicado. Los miembros ya pueden inscribirse.' });
      await events.reload();
    } catch (err) {
      setMsg({ tone: 'error', text: errorText(err) });
    }
  };

  const cancel = async (ev: CommunityEvent) => {
    if (!window.confirm(`¿Cancelar "${ev.title}"?`)) return;
    try {
      await api.del(`/api/community/events/${ev.id}`);
      await events.reload();
    } catch (err) {
      setMsg({ tone: 'error', text: errorText(err) });
    }
  };

  const toggleAttendees = async (ev: CommunityEvent) => {
    if (open === ev.id) return setOpen(null);
    setOpen(ev.id);
    setAttendees(null);
    setAttendees(await api.get<Attendee[]>(`/api/community/events/${ev.id}/attendees`).catch(() => []));
  };

  return (
    <>
      <PageHead title="Eventos de networking">Publica encuentros en cada sede; los miembros los ven en Comunidad y en la página de la sede.</PageHead>

      <section className="block">
        <h2>Nuevo evento</h2>
        <form className="form" onSubmit={create}>
          <div className="field-row">
            <label className="field">
              Sede
              <select value={form.locationId} onChange={set('locationId')}>
                {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="field">Título<input required minLength={3} value={form.title} onChange={set('title')} placeholder="Café de emprendedores" /></label>
          </div>
          <label className="field">Descripción<textarea rows={2} value={form.description} onChange={set('description')} /></label>
          <div className="field-row field-row-4">
            <label className="field">Fecha<input type="date" required value={form.date} onChange={set('date')} min={new Date().toISOString().slice(0, 10)} /></label>
            <label className="field">Hora<input type="time" required value={form.hour} onChange={set('hour')} /></label>
            <label className="field">Duración (min)<input type="number" min={15} max={600} value={form.durationMinutes} onChange={set('durationMinutes')} /></label>
            <label className="field">Cupos<input type="number" min={1} max={1000} value={form.capacity} onChange={set('capacity')} /></label>
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="form-actions form-actions-start"><button className="btn btn-primary">Publicar evento</button></div>
        </form>
      </section>

      <section className="block">
        <h2>Próximos eventos</h2>
        {events.loading && !events.data && <Loading />}
        {events.error && <Notice tone="error">{events.error}</Notice>}
        {events.data && events.data.length === 0 && <Empty title="No hay eventos publicados" />}
        {events.data && events.data.length > 0 && (
          <ul className="rows">
            {events.data.map((ev) => (
              <li key={ev.id} className="row row-wrap">
                <div className="row-main">
                  <p className="row-title">{ev.title}</p>
                  <p className="row-sub">{locName(ev.locationId)} · {longDay(ev.scheduledAt)}, {time(ev.scheduledAt)} · {ev.attendeeCount}/{ev.capacity} inscritos</p>
                  {open === ev.id && (
                    <div className="attendees">
                      {!attendees && <Loading />}
                      {attendees?.length === 0 && <p className="hint">Nadie se ha inscrito todavía.</p>}
                      {attendees && attendees.length > 0 && <p>{attendees.map((a) => a.displayName).join(', ')}</p>}
                    </div>
                  )}
                </div>
                <button className="btn btn-quiet" onClick={() => void toggleAttendees(ev)}>{open === ev.id ? 'Ocultar' : 'Inscritos'}</button>
                <button className="btn btn-quiet btn-danger" onClick={() => void cancel(ev)}>Cancelar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
