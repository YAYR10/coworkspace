import { useEffect, useState } from 'react';
import { api, Me, onWakingChange, refreshSession, Role, ROLE_LABEL } from './api';
import { AuthProvider, useAuth } from './components/Auth';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { useSession } from './hooks';
import { link, navigate, useRoute } from './router';
import { BillingView } from './views/BillingView';
import { BookingsView } from './views/BookingsView';
import { HomeView } from './views/HomeView';
import { MembershipView } from './views/MembershipView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { SiteView } from './views/SiteView';
import { FinanceView } from './views/admin/FinanceView';
import { MailView } from './views/admin/MailView';
import { OverviewView } from './views/admin/OverviewView';
import { PlansView } from './views/admin/PlansView';
import { UsersView } from './views/admin/UsersView';
import { LocationsView } from './views/staff/LocationsView';
import { OccupancyView } from './views/staff/OccupancyView';

/**
 * Experiencia pública primero (como un portal de arriendos): cualquiera busca sedes y ve horarios;
 * la cuenta se pide solo al reservar o suscribirse. Detrás:
 *  - Mi cuenta (miembro): reservas, membresía, pagos, avisos, perfil.
 *  - Panel (coordinador / administrador): sedes, ocupación y, para el jefe, usuarios, planes, dinero y correos.
 */
interface Section { id: string; label: string }

const ACCOUNT: Section[] = [
  { id: 'reservas', label: 'Mis reservas' },
  { id: 'membresia', label: 'Membresía' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'avisos', label: 'Notificaciones' },
  { id: 'perfil', label: 'Mi perfil' },
];
const PANEL: { title: string; roles: Role[]; items: Section[] }[] = [
  {
    title: 'Administración',
    roles: ['ADMIN'],
    items: [
      { id: 'resumen', label: 'Resumen' },
      { id: 'usuarios', label: 'Usuarios y roles' },
      { id: 'planes', label: 'Planes' },
      { id: 'facturacion', label: 'Facturación' },
      { id: 'correos', label: 'Correos' },
    ],
  },
  {
    title: 'Coordinación',
    roles: ['ADMIN', 'COORDINATOR'],
    items: [
      { id: 'sedes', label: 'Sedes y servicios' },
      { id: 'ocupacion', label: 'Ocupación' },
    ],
  },
];

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const route = useRoute();
  const session = useSession();
  const [waking, setWaking] = useState(false);

  useEffect(() => onWakingChange(setWaking), []);

  // Si un administrador cambió el rol de este usuario, se renueva el token para que el cambio aplique ya.
  useEffect(() => {
    if (!session) return;
    api
      .get<Me>('/api/members/me')
      .then((me) => me.role !== session.member.role && void refreshSession())
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.member.id]);

  const inApp = route.name === 'account' || route.name === 'panel';

  return (
    <div className="app">
      <SiteHeader wide={inApp} />
      {waking && (
        <p className="waking" role="status">
          Estamos activando los servicios; la primera carga puede tardar hasta un minuto.
        </p>
      )}
      <main className="app-main">
        {route.name === 'home' && <HomeView />}
        {route.name === 'site' && <SiteView key={route.param} id={route.param!} />}
        {route.name === 'account' && <Account section={route.param!} />}
        {route.name === 'panel' && <Panel section={route.param} />}
      </main>
      {!inApp && <SiteFooter />}
    </div>
  );
}

function NeedLogin({ text }: { text: string }) {
  const { requireLogin } = useAuth();
  return (
    <div className="container page-pad">
      <div className="empty empty-lg">
        <p className="empty-title">{text}</p>
        <div className="empty-body">
          <button className="btn btn-primary" onClick={() => requireLogin(text)}>Iniciar sesión</button>
        </div>
      </div>
    </div>
  );
}

function SideLayout({ groups, current, base }: { groups: { title?: string; items: Section[] }[]; current: string; base: string }) {
  return (
    <nav className="sidebar" aria-label="Secciones">
      {groups.map((g, i) => (
        <div key={i} className="nav-group">
          {g.title && <p className="nav-title">{g.title}</p>}
          {g.items.map((s) => (
            <a
              key={s.id}
              href={link(`${base}/${s.id}`)}
              className="nav-link"
              aria-current={current === s.id ? 'page' : undefined}
            >
              {s.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Account({ section }: { section: string }) {
  const session = useSession();
  if (!session) return <NeedLogin text="Inicia sesión para ver tu cuenta" />;
  const current = ACCOUNT.some((s) => s.id === section) ? section : 'reservas';
  return (
    <div className="layout">
      <SideLayout groups={[{ title: 'Mi cuenta', items: ACCOUNT }]} current={current} base="/cuenta" />
      <div className="page">
        {current === 'reservas' && <BookingsView />}
        {current === 'membresia' && <MembershipView />}
        {current === 'pagos' && <BillingView />}
        {current === 'avisos' && <NotificationsView />}
        {current === 'perfil' && <ProfileView />}
      </div>
    </div>
  );
}

function Panel({ section }: { section?: string }) {
  const session = useSession();
  if (!session) return <NeedLogin text="Inicia sesión con una cuenta de coordinador o administrador" />;
  const role = session.member.role;
  const groups = PANEL.filter((g) => g.roles.includes(role));
  if (groups.length === 0)
    return (
      <div className="container page-pad">
        <div className="empty empty-lg">
          <p className="empty-title">Este panel es para coordinadores y administradores</p>
          <div className="empty-body">
            Tu cuenta es de {ROLE_LABEL[role].toLowerCase()}. Si necesitas acceso, pídeselo al administrador.
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Ir a las sedes</button>
          </div>
        </div>
      </div>
    );
  const all = groups.flatMap((g) => g.items);
  const current = all.find((s) => s.id === section)?.id ?? all[0].id;
  const go = (id: string) => navigate(`/panel/${id}`);
  return (
    <div className="layout">
      <SideLayout groups={groups} current={current} base="/panel" />
      <div className="page">
        {current === 'resumen' && <OverviewView onGoTo={go} />}
        {current === 'usuarios' && <UsersView me={session.member.id} />}
        {current === 'planes' && <PlansView />}
        {current === 'facturacion' && <FinanceView />}
        {current === 'correos' && <MailView />}
        {current === 'sedes' && <LocationsView isAdmin={role === 'ADMIN'} />}
        {current === 'ocupacion' && <OccupancyView isAdmin={role === 'ADMIN'} />}
      </div>
    </div>
  );
}
