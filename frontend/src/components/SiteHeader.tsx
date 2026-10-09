import { useEffect, useRef, useState } from 'react';
import { logout, ROLE_LABEL } from '../api';
import { initials } from '../format';
import { useSession } from '../hooks';
import { link, navigate } from '../router';
import { useAuth } from './Auth';
import { Brand } from './ServiceStatus';

const ACCOUNT = [
  { path: '/cuenta/reservas', label: 'Mis reservas' },
  { path: '/cuenta/membresia', label: 'Membresía' },
  { path: '/cuenta/pagos', label: 'Pagos' },
  { path: '/cuenta/avisos', label: 'Notificaciones' },
  { path: '/cuenta/perfil', label: 'Mi perfil' },
];

/** Encabezado común: marca a la izquierda; acceso o menú de la cuenta a la derecha. */
export function SiteHeader({ wide = false }: { wide?: boolean }) {
  const session = useSession();
  const { openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => menu.current && !menu.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const role = session?.member.role;
  const staff = role === 'ADMIN' || role === 'COORDINATOR';
  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <header className="site-header">
      <div className={`site-header-inner${wide ? ' is-wide' : ''}`}>
        <a href={link('/')} className="brand-link" aria-label="CoworkSpace, inicio">
          <Brand />
        </a>
        <nav className="site-nav" aria-label="Principal">
          <a href={link('/')}>Sedes</a>
          <a href={link('/')} onClick={(e) => { e.preventDefault(); navigate('/'); setTimeout(() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' }), 60); }}>
            Planes
          </a>
          {staff && <a href={link('/panel')}>{role === 'ADMIN' ? 'Administración' : 'Coordinación'}</a>}
        </nav>
        {!session ? (
          <div className="site-actions">
            <button className="btn btn-quiet" onClick={() => openAuth('login')}>Iniciar sesión</button>
            <button className="btn btn-primary" onClick={() => openAuth('register')}>Crear cuenta</button>
          </div>
        ) : (
          <div className="user-menu" ref={menu}>
            <button className="user-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
              <span className="avatar" aria-hidden="true">{initials(session.member.name)}</span>
              <span className="user-name">{session.member.name.split(' ')[0]}</span>
            </button>
            {open && (
              <div className="user-pop" role="menu">
                <p className="user-pop-head">
                  <strong>{session.member.name}</strong>
                  <span>{session.member.email}</span>
                  {role !== 'MEMBER' && <span className={`role role-${role!.toLowerCase()}`}>{ROLE_LABEL[role!]}</span>}
                </p>
                {staff && (
                  <button role="menuitem" onClick={() => go('/panel')}>
                    {role === 'ADMIN' ? 'Panel de administración' : 'Panel de coordinación'}
                  </button>
                )}
                {ACCOUNT.map((a) => (
                  <button key={a.path} role="menuitem" onClick={() => go(a.path)}>{a.label}</button>
                ))}
                <button role="menuitem" className="user-pop-out" onClick={() => { setOpen(false); void logout(); navigate('/'); }}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
