import { useCallback, useEffect, useState } from 'react';
import { logout } from './api';
import { Brand, StatusChip, WakeUp } from './components/ServiceStatus';
import { useSession } from './hooks';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { BillingView } from './views/BillingView';
import { BookView } from './views/BookView';
import { BookingsView } from './views/BookingsView';
import { MembershipView } from './views/MembershipView';

const TABS = [
  { id: 'reservar', label: 'Reservar' },
  { id: 'reservas', label: 'Mis reservas' },
  { id: 'membresia', label: 'Membresía' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'admin', label: 'Administrar', admin: true },
] as const;
type TabId = (typeof TABS)[number]['id'];

const readHash = (): TabId => {
  const h = window.location.hash.slice(1);
  return (TABS.some((t) => t.id === h) ? h : 'reservar') as TabId;
};

export default function App() {
  const session = useSession();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>(readHash);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!ready) return <WakeUp onReady={markReady} />;
  if (!session) return <AuthView />;

  const isAdmin = session.member.role === 'ADMIN';
  const current = tab === 'admin' && !isAdmin ? 'reservar' : tab;
  const go = (id: TabId) => {
    window.location.hash = id;
    setTab(id);
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <nav className="tabs" aria-label="Secciones">
          {TABS.filter((t) => !('admin' in t) || isAdmin).map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="tab"
              aria-current={current === t.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(t.id);
              }}
            >
              {t.label}
            </a>
          ))}
        </nav>
        <div className="topbar-end">
          <StatusChip />
          <span className="who">
            {session.member.name}
            {isAdmin && <span className="role">Admin</span>}
          </span>
          <button className="btn btn-quiet" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </header>
      <main className="page">
        {current === 'reservar' && <BookView onGoTo={go} />}
        {current === 'reservas' && <BookingsView onGoTo={go} />}
        {current === 'membresia' && <MembershipView />}
        {current === 'pagos' && <BillingView />}
        {current === 'admin' && <AdminView />}
      </main>
    </div>
  );
}
