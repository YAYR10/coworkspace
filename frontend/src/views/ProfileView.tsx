import { FormEvent, useEffect, useState } from 'react';
import { api, Booking, getSession, Me, ROLE_LABEL, setSession } from '../api';
import { Loading, Notice, PageHead } from '../components/ui';
import { date, initials } from '../format';
import { errorText, useLoad } from '../hooks';
import { countryFilter, getCountry } from '../location';

const ROLE_TEXT = {
  MEMBER: 'Reservas salas y puestos en cualquier sede.',
  COORDINATOR: 'Publicas sedes, salas, puestos y servicios, y ves la ocupación.',
  ADMIN: 'Tienes acceso a todo: usuarios y roles, planes, facturación y sedes.',
} as const;

export function ProfileView() {
  const me = useLoad(() => api.get<Me>('/api/members/me'));
  const bookings = useLoad(() => api.get<Booking[]>('/api/bookings/me'));
  const [form, setForm] = useState({ name: '', phone: '', country: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!me.data) return;
    setForm({
      name: me.data.name,
      phone: me.data.phone ?? '',
      country: me.data.country ?? countryFilter(getCountry()) ?? '',
      city: me.data.city ?? '',
    });
  }, [me.data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
      const updated = await api.patch<Me>('/api/members/me', body);
      me.setData(updated);
      const s = getSession();
      if (s) setSession({ ...s, member: { ...s.member, name: updated.name } });
      setMsg({ tone: 'ok', text: 'Perfil actualizado.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorText(err) });
    } finally {
      setSaving(false);
    }
  };

  if (me.loading && !me.data) return <Loading />;
  if (me.error) return <Notice tone="error">{me.error}</Notice>;
  const m = me.data!;
  const plan = m.subscriptions?.[0]?.plan;
  const list = bookings.data ?? [];
  const upcoming = list.filter((b) => b.status !== 'CANCELLED' && new Date(b.endTime).getTime() > Date.now()).length;
  const confirmed = list.filter((b) => b.status === 'CONFIRMED').length;

  return (
    <>
      <PageHead title="Mi perfil" />

      <section className="profile-card">
        <span className="avatar avatar-lg" aria-hidden="true">{initials(m.name)}</span>
        <div className="profile-id">
          <p className="profile-name">{m.name}</p>
          <p className="profile-mail">{m.email}</p>
          <p className="profile-role">
            <span className={`role role-${m.role.toLowerCase()}`}>{ROLE_LABEL[m.role]}</span>
            <span>{ROLE_TEXT[m.role]}</span>
          </p>
        </div>
        <dl className="profile-facts">
          <div><dt>Miembro desde</dt><dd>{date(m.createdAt)}</dd></div>
          <div><dt>Plan</dt><dd>{plan ? plan.name : 'Sin plan'}</dd></div>
          <div><dt>Reservas próximas</dt><dd>{bookings.data ? upcoming : '–'}</dd></div>
          <div><dt>Reservas confirmadas</dt><dd>{bookings.data ? confirmed : '–'}</dd></div>
        </dl>
      </section>

      <div className="profile-grid">
        <section className="block">
          <h2>Datos personales</h2>
          <form className="form" onSubmit={save}>
            <label className="field">
              <span>Nombre</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoComplete="name" />
            </label>
            <label className="field">
              <span>Correo</span>
              <input value={m.email} disabled />
              <small>El correo es tu usuario y no se puede cambiar.</small>
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 123 4567" autoComplete="tel" />
            </label>
            <div className="field-row">
              <label className="field">
                <span>País</span>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} autoComplete="country-name" />
              </label>
              <label className="field">
                <span>Ciudad</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" />
              </label>
            </div>
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </form>
        </section>
        <PasswordForm />
      </div>
    </>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next !== repeat) {
      setMsg({ tone: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/members/me/password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setRepeat('');
      setMsg({ tone: 'ok', text: 'Contraseña cambiada. Se cerraron tus sesiones en otros dispositivos.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="block">
      <h2>Cambiar contraseña</h2>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Contraseña actual</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </label>
        <label className="field">
          <span>Nueva contraseña</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
          <small>Mínimo 8 caracteres.</small>
        </label>
        <label className="field">
          <span>Repite la nueva contraseña</span>
          <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required minLength={8} autoComplete="new-password" />
        </label>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <button className="btn btn-ghost" disabled={busy}>{busy ? 'Cambiando…' : 'Cambiar contraseña'}</button>
      </form>
    </section>
  );
}
