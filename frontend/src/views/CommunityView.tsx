import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, api, ChatMessage, CommunityEvent, CommunityProfile, Conversation, Location } from '../api';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { date, initials, longDay, time } from '../format';
import { errorText, useLoad, useSession } from '../hooks';
import { link } from '../router';

type Tab = 'directorio' | 'eventos' | 'mensajes' | 'perfil';
const TABS: { id: Tab; label: string }[] = [
  { id: 'directorio', label: 'Directorio' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'mensajes', label: 'Mensajes' },
  { id: 'perfil', label: 'Mi perfil público' },
];

/** Comunidad: directorio de miembros, eventos de networking por sede y mensajería interna. */
export function CommunityView() {
  const [tab, setTab] = useState<Tab>('directorio');
  const [chatWith, setChatWith] = useState<{ memberId: string; displayName: string } | null>(null);
  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const myProfile = useLoad(() => api.get<CommunityProfile | null>('/api/community/profile/me'));

  const openChat = (p: { memberId: string; displayName: string }) => {
    setChatWith(p);
    setTab('mensajes');
  };

  return (
    <>
      <PageHead title="Comunidad">Conoce a otros miembros, inscríbete a los eventos de tu sede y escríbeles directamente.</PageHead>
      <div className="switch switch-wrap tabs-row" role="tablist" aria-label="Comunidad">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {myProfile.data === null && tab !== 'perfil' && !myProfile.loading && (
        <Notice>
          Aún no apareces en el directorio. <button className="btn btn-quiet" onClick={() => setTab('perfil')}>Crear mi perfil público</button>
        </Notice>
      )}
      {tab === 'directorio' && <Directory locations={locations.data ?? []} onMessage={openChat} />}
      {tab === 'eventos' && <Events locations={locations.data ?? []} />}
      {tab === 'mensajes' && <Messages initial={chatWith} />}
      {tab === 'perfil' && <ProfileForm locations={locations.data ?? []} profile={myProfile.data ?? null} onSaved={(p) => myProfile.setData(p)} />}
    </>
  );
}

function GateError({ error }: { error: string | null }) {
  if (!error) return null;
  if (/membres/i.test(error))
    return (
      <Empty title="La comunidad es para miembros con plan vigente">
        <a href={link('/cuenta/membresia')}>Elige un plan</a> para entrar al directorio, a los eventos y a la mensajería.
      </Empty>
    );
  return <Notice tone="error">{error}</Notice>;
}

function Directory({ locations, onMessage }: { locations: Location[]; onMessage: (p: CommunityProfile) => void }) {
  const session = useSession();
  const [q, setQ] = useState('');
  const [locationId, setLocationId] = useState('');
  const [query, setQuery] = useState({ q: '', locationId: '' });
  const members = useLoad(() => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.locationId) params.set('locationId', query.locationId);
    return api.get<CommunityProfile[]>(`/api/community/members?${params}`);
  }, [query.q, query.locationId]);
  const locName = (id?: string | null) => locations.find((l) => l.id === id)?.name;

  const search = (e: FormEvent) => {
    e.preventDefault();
    setQuery({ q: q.trim(), locationId });
  };

  return (
    <section className="block">
      <form className="filters" onSubmit={search}>
        <label className="field field-grow">
          Buscar
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, empresa, profesión…" />
        </label>
        <label className="field">
          Sede
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Todas</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary">Buscar</button>
      </form>
      {members.loading && !members.data && <Loading />}
      <GateError error={members.error} />
      {members.data && members.data.length === 0 && <Empty title="Nadie coincide con la búsqueda">Prueba con otra palabra o con otra sede.</Empty>}
      {members.data && members.data.length > 0 && (
        <ul className="people">
          {members.data.map((p) => (
            <li key={p.memberId} className="person">
              <span className="avatar" aria-hidden="true">{initials(p.displayName)}</span>
              <div className="person-main">
                <p className="row-title">{p.displayName}</p>
                <p className="row-sub">{[p.headline, p.company].filter(Boolean).join(' · ') || 'Miembro de CoworkSpace'}</p>
                {locName(p.locationId) && <p className="row-sub">Sede habitual: {locName(p.locationId)}</p>}
                {p.bio && <p className="person-bio">{p.bio}</p>}
                {p.skills.length > 0 && (
                  <p className="chips">{p.skills.map((s) => <span key={s} className="tag">{s}</span>)}</p>
                )}
              </div>
              {p.memberId !== session?.member.id && (
                <button className="btn btn-ghost" onClick={() => onMessage(p)}>Escribir</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Events({ locations }: { locations: Location[] }) {
  const [locationId, setLocationId] = useState('');
  const events = useLoad(() => api.get<CommunityEvent[]>(`/api/community/events${locationId ? `?locationId=${locationId}` : ''}`), [locationId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? 'Sede';

  const toggle = async (e: CommunityEvent) => {
    setBusy(e.id);
    setError(null);
    try {
      if (e.attending) await api.del(`/api/community/events/${e.id}/attend`);
      else await api.post(`/api/community/events/${e.id}/attend`);
      await events.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="block">
      <div className="block-head">
        <label className="field field-inline">
          Sede
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Todas</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      </div>
      <GateError error={error} />
      {events.loading && !events.data && <Loading />}
      {events.error && <Notice tone="error">{events.error}</Notice>}
      {events.data && events.data.length === 0 && <Empty title="No hay eventos próximos">Los coordinadores publican aquí los encuentros de networking de cada sede.</Empty>}
      {events.data && events.data.length > 0 && <EventList events={events.data} locName={locName} busy={busy} onToggle={toggle} />}
    </section>
  );
}

export function EventList({
  events,
  locName,
  busy,
  onToggle,
}: {
  events: CommunityEvent[];
  locName?: (id: string) => string;
  busy?: string | null;
  onToggle?: (e: CommunityEvent) => void;
}) {
  return (
    <ul className="rows">
      {events.map((e) => (
        <li key={e.id} className="row event-row">
          <div className="event-date" aria-hidden="true">
            <strong>{new Date(e.scheduledAt).getDate()}</strong>
            <span>{new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(e.scheduledAt))}</span>
          </div>
          <div className="row-main">
            <p className="row-title">{e.title}</p>
            <p className="row-sub">
              {longDay(e.scheduledAt)}, {time(e.scheduledAt)} · {e.durationMinutes} min{locName ? ` · ${locName(e.locationId)}` : ''}
            </p>
            {e.description && <p className="person-bio">{e.description}</p>}
            <p className="row-sub">{e.spotsLeft > 0 ? `${e.spotsLeft} de ${e.capacity} cupos libres` : 'Sin cupos'}</p>
          </div>
          {onToggle && (
            <button
              className={e.attending ? 'btn btn-ghost' : 'btn btn-primary'}
              disabled={busy === e.id || (!e.attending && e.spotsLeft === 0)}
              onClick={() => onToggle(e)}
            >
              {busy === e.id ? '…' : e.attending ? 'Cancelar asistencia' : 'Asistiré'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Messages({ initial }: { initial: { memberId: string; displayName: string } | null }) {
  const session = useSession();
  const [current, setCurrent] = useState(initial);
  const inbox = useLoad(() => api.get<Conversation[]>('/api/community/messages'));
  const thread = useLoad(
    () => (current ? api.get<ChatMessage[]>(`/api/community/messages/${current.memberId}`) : Promise.resolve([] as ChatMessage[])),
    [current?.memberId],
  );
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Revisa mensajes nuevos cada 10 s mientras la conversación está abierta
  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => void thread.reload(), 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.memberId]);

  const threads = useMemo(() => {
    const list = inbox.data ?? [];
    if (current && !list.some((c) => c.memberId === current.memberId))
      return [{ memberId: current.memberId, displayName: current.displayName, lastMessage: '', lastAt: new Date().toISOString(), unread: 0 }, ...list];
    return list;
  }, [inbox.data, current]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!current || !body.trim()) return;
    setError(null);
    try {
      await api.post('/api/community/messages', { recipientId: current.memberId, body });
      setBody('');
      await Promise.all([thread.reload(), inbox.reload()]);
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (inbox.error) return <GateError error={inbox.error} />;
  return (
    <section className="block chat">
      <ul className="chat-list" aria-label="Conversaciones">
        {inbox.loading && !inbox.data && <li><Loading /></li>}
        {threads.length === 0 && !inbox.loading && <li className="hint">Aún no tienes conversaciones. Escríbele a alguien desde el directorio.</li>}
        {threads.map((c) => (
          <li key={c.memberId}>
            <button className="chat-item" aria-current={current?.memberId === c.memberId ? 'true' : undefined} onClick={() => setCurrent(c)}>
              <span className="row-title">{c.displayName}</span>
              {c.unread > 0 && <span className="badge">{c.unread}</span>}
              <span className="row-sub chat-preview">{c.lastMessage || 'Nueva conversación'}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="chat-thread">
        {!current && <p className="hint">Elige una conversación.</p>}
        {current && (
          <>
            <p className="chat-title">{current.displayName}</p>
            <div className="chat-messages">
              {thread.data?.length === 0 && <p className="hint">Escribe el primer mensaje.</p>}
              {thread.data?.map((m) => (
                <p key={m.id} className={m.senderId === session?.member.id ? 'bubble bubble-me' : 'bubble'}>
                  {m.body}
                  <span>{date(m.createdAt)}, {time(m.createdAt)}</span>
                </p>
              ))}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <form className="chat-form" onSubmit={send}>
              <input aria-label="Mensaje" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un mensaje…" maxLength={2000} />
              <button className="btn btn-primary" disabled={!body.trim()}>Enviar</button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

function ProfileForm({ locations, profile, onSaved }: { locations: Location[]; profile: CommunityProfile | null; onSaved: (p: CommunityProfile) => void }) {
  const session = useSession();
  const [form, setForm] = useState({ displayName: '', headline: '', company: '', bio: '', skills: '', locationId: '', linkedinUrl: '', visible: true });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      displayName: profile?.displayName ?? session?.member.name ?? '',
      headline: profile?.headline ?? '',
      company: profile?.company ?? '',
      bio: profile?.bio ?? '',
      skills: (profile?.skills ?? []).join(', '),
      locationId: profile?.locationId ?? '',
      linkedinUrl: profile?.linkedinUrl ?? '',
      visible: profile?.visible ?? true,
    });
  }, [profile, session?.member.name]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        displayName: form.displayName.trim(),
        visible: form.visible,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      for (const k of ['headline', 'company', 'bio', 'locationId', 'linkedinUrl'] as const) if (form[k].trim()) body[k] = form[k].trim();
      onSaved(await api.put<CommunityProfile>('/api/community/profile/me', body));
      setMsg({ tone: 'ok', text: 'Perfil guardado.' });
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof ApiError && /membres/i.test(err.message) ? 'Necesitas un plan vigente para aparecer en la comunidad.' : errorText(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="block">
      <form className="form form-narrow" onSubmit={save}>
        <label className="field">Nombre visible<input required minLength={2} value={form.displayName} onChange={set('displayName')} /></label>
        <div className="field-row">
          <label className="field">Profesión o cargo<input value={form.headline} onChange={set('headline')} placeholder="Diseñadora UX" /></label>
          <label className="field">Empresa<input value={form.company} onChange={set('company')} /></label>
        </div>
        <label className="field">Sobre mí<textarea rows={3} value={form.bio} onChange={set('bio')} maxLength={1000} /></label>
        <label className="field">Habilidades<input value={form.skills} onChange={set('skills')} placeholder="Marketing, React, Finanzas" /><small>Separadas por comas</small></label>
        <div className="field-row">
          <label className="field">
            Sede habitual
            <select value={form.locationId} onChange={set('locationId')}>
              <option value="">Sin preferencia</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="field">LinkedIn<input type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/…" /></label>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
          Mostrarme en el directorio de miembros
        </label>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="form-actions form-actions-start">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar perfil'}</button>
        </div>
      </form>
    </section>
  );
}
