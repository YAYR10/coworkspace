import { useCallback, useEffect, useState } from 'react';
import { api, logout, Me, refreshSession, Role, ROLE_LABEL } from './api';
import { LocationPrompt, PinIcon } from './components/LocationPrompt';
import { Brand, StatusChip, WakeUp } from './components/ServiceStatus';
import { initials } from './format';
import { useSession } from './hooks';
import { ALL, useCountry } from './location';
import { AuthView } from './views/AuthView';
import { BillingView } from './views/BillingView';
import { BookView } from './views/BookView';
import { BookingsView } from './views/BookingsView';
import { MembershipView } from './views/MembershipView';
import { ProfileView } from './views/ProfileView';
import { FinanceView } from './views/admin/FinanceView';
import { OverviewView } from './views/admin/OverviewView';
import { PlansView } from './views/admin/PlansView';
import { UsersView } from './views/admin/UsersView';
import { LocationsView } from './views/staff/LocationsView';
import { OccupancyView } from './views/staff/OccupancyView';

/**
 * Tres vistas según el rol:
 *  - Miembro: "Mi espacio" (reservar, reservas, membresía, pagos, perfil).
 *  - Coordinador: además "Coordinación" (publicar sedes y servicios, ver ocupación).
 *  - Administrador (jefe): además "Administración" (resumen, usuarios y roles, planes, facturación).
 */
type Group = 'admin' | 'coord' | 'mine';
interface Section { id: string; label: string; group: Group }

const SECTIONS: Section[] = [
  { id: 'resumen', label: 'Resumen', group: 'admin' },
  { id: 'usuarios', label: 'Usuarios y roles', group: 'admin' },
  { id: 'planes', label: 'Planes', group: 'admin' },
  { id: 'facturacion', label: 'Facturación', group: 'admin' },
  { id: 'sedes', label: 'Sedes y servicios', group: 'coord' },
  { id: 'ocupacion', label: 'Ocupación', group: 'coord' },
  { id: 'reservar', label: 'Reservar', group: 'mine' },
  { id: 'reservas', label: 'Mis reservas', group: 'mine' },
  { id: 'membresia', label: 'Membresía', group: 'mine' },
  { id: 'pagos', label: 'Mis pagos', group: 'mine' },
  { id: 'perfil', label: 'Mi perfil', group: 'mine' },
];
const GROUP_LABEL: Record<Group, string> = { admin: 'Administración', coord: 'Coordinación', mine: 'Mi espacio' };
const GROUPS_BY_ROLE: Record<Role, Group[]> = { ADMIN: ['admin', 'coord', 'mine'], COORDINATOR: ['coord', 'mine'], MEMBER: ['mine'] };
const HOME: Record<Role, string> = { ADMIN: 'resumen', COORDINATOR: 'sedes', MEMBER: 'reservar' };
const PANEL: Record<Role, string> = { ADMIN: 'Panel de administración', COORDINATOR: 'Panel de coordinación', MEMBER: 'Panel de miembro' };

const readHash = () => window.location.hash.slice(1);

export default function App() {
  const session = useSession();
  const country = useCountry();
  const [ready, setReady] = useState(false);
  const [askCountry, setAskCountry] = useState(false);
  const [hash, setHash] = useState(readHash);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const onHash = () => setHash(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Si un administrador cambió el rol de este usuario, se renueva el token para que el cambio aplique ya.
  useEffect(() => {
    if (!ready || !session) return;
    api
      .get<Me>('/api/members/me')
      .then((me) => {
        if (me.role !== session.member.role) void refreshSession();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session?.member.id]);

  if (!ready) return <WakeUp onReady={markReady} />;
  if (!country || askCountry) return <LocationPrompt current={country} onDone={() => setAskCountry(false)} />;
  if (!session) return <AuthView onChangeCountry={() => setAskCountry(true)} />;

  const role = session.member.role;
  const allowed = SECTIONS.filter((s) => GROUPS_BY_ROLE[role].includes(s.group));
  const current = allowed.find((s) => s.id === hash)?.id ?? HOME[role];
  const go = (id: string) => {
    window.location.hash = id;
    setHash(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className={`shell shell-${role.toLowerCase()}`}>
      <header className="topbar">
        <div className="topbar-start">
          <Brand />
          {role !== 'MEMBER' && <span className="panel-name">{PANEL[role]}</span>}
        </div>
        <div className="topbar-end">
          <button className="country-btn" onClick={() => setAskCountry(true)} title="Cambiar país">
            <PinIcon />
            <span>{country === ALL ? 'Todos los países' : country}</span>
          </button>
          <StatusChip />
          <button className="me-btn" onClick={() => go('perfil')} title="Mi perfil">
            <span className="avatar" aria-hidden="true">{initials(session.member.name)}</span>
            <span className="me-name">{session.member.name}</span>
            {role !== 'MEMBER' && <span className={`role role-${role.toLowerCase()}`}>{ROLE_LABEL[role]}</span>}
          </button>
          <button className="btn btn-quiet" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="sidebar" aria-label="Secciones">
          {GROUPS_BY_ROLE[role].map((g) => (
            <div key={g} className="nav-group">
              {GROUPS_BY_ROLE[role].length > 1 && <p className="nav-title">{GROUP_LABEL[g]}</p>}
              {allowed
                .filter((s) => s.group === g)
                .map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="nav-link"
                    aria-current={current === s.id ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(s.id);
                    }}
                  >
                    {s.label}
                  </a>
                ))}
            </div>
          ))}
        </nav>

        <main className="page">
          {current === 'resumen' && <OverviewView onGoTo={go} />}
          {current === 'usuarios' && <UsersView me={session.member.id} />}
          {current === 'planes' && <PlansView />}
          {current === 'facturacion' && <FinanceView />}
          {current === 'sedes' && <LocationsView />}
          {current === 'ocupacion' && <OccupancyView isAdmin={role === 'ADMIN'} />}
          {current === 'reservar' && <BookView onGoTo={go} />}
          {current === 'reservas' && <BookingsView onGoTo={go} />}
          {current === 'membresia' && <MembershipView />}
          {current === 'pagos' && <BillingView />}
          {current === 'perfil' && <ProfileView />}
        </main>
      </div>
    </div>
  );
}

