import { useEffect, useState } from 'react';
import { api, MemberRow, Role, ROLE_LABEL } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { date, initials } from '../../format';
import { errorText, useLoad } from '../../hooks';

const ROLES: Role[] = ['MEMBER', 'COORDINATOR', 'ADMIN'];
const ROLE_HELP: Record<Role, string> = {
  MEMBER: 'Reserva espacios.',
  COORDINATOR: 'Publica sedes, servicios, salas y puestos; ve la ocupación.',
  ADMIN: 'Puede hacer todo, incluido cambiar roles.',
};

/** Solo administrador: ver usuarios y asignar roles. */
export function UsersView({ me }: { me: string }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const users = useLoad(() => {
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    if (role) params.set('role', role);
    return api.get<MemberRow[]>(`/api/members?${params}`);
  }, [term, role]);

  const change = async (u: MemberRow, next: Role) => {
    if (next === u.role) return;
    if (!window.confirm(`¿Cambiar a ${u.name} de ${ROLE_LABEL[u.role]} a ${ROLE_LABEL[next]}?`)) return;
    setSaving(u.id);
    setMsg(null);
    try {
      await api.patch(`/api/members/${u.id}/role`, { role: next });
      setMsg({ tone: 'ok', text: `${u.name} ahora es ${ROLE_LABEL[next].toLowerCase()}. El cambio aplica la próxima vez que abra la página.` });
      await users.reload();
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHead title="Usuarios y roles">Asigna quién coordina las sedes y quién administra. Cada persona se registra desde la página de inicio.</PageHead>

      <dl className="role-legend">
        {ROLES.map((r) => (
          <div key={r}>
            <dt><span className={`role role-${r.toLowerCase()}`}>{ROLE_LABEL[r]}</span></dt>
            <dd>{ROLE_HELP[r]}</dd>
          </div>
        ))}
      </dl>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="toolbar">
        <label className="field field-inline field-grow">
          <span>Buscar</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o correo" />
        </label>
        <label className="field field-inline">
          <span>Rol</span>
          <select value={role} onChange={(e) => setRole(e.target.value as '' | Role)}>
            <option value="">Todos</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      </div>

      {users.loading && !users.data && <Loading />}
      {users.error && <Notice tone="error">{users.error}</Notice>}
      {users.data && users.data.length === 0 && <Empty title="Nadie coincide con la búsqueda" />}
      {users.data && users.data.length > 0 && (
        <ul className="rows">
          {users.data.map((u) => (
            <li key={u.id} className="row user-row">
              <span className="avatar" aria-hidden="true">{initials(u.name)}</span>
              <div className="row-main">
                <p className="row-title">{u.name}{u.id === me && <span className="you"> (tú)</span>}</p>
                <p className="row-sub row-plain">
                  {u.email}
                  {u.country ? `, ${u.city ? `${u.city}, ` : ''}${u.country}` : ''}
                </p>
                <p className="row-sub">
                  {u.subscriptions[0]?.plan.name ?? 'Sin plan'}, desde el {date(u.createdAt)}
                </p>
              </div>
              <label className="field field-inline">
                <span className="visually-hidden">Rol de {u.name}</span>
                <select
                  value={u.role}
                  disabled={u.id === me || saving === u.id}
                  onChange={(e) => void change(u, e.target.value as Role)}
                  title={u.id === me ? 'No puedes cambiar tu propio rol' : undefined}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
