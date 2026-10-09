import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSession, login, register } from '../api';
import { errorText } from '../hooks';
import { countryFilter, getCountry } from '../location';
import { CloseIcon } from './icons';
import { Notice } from './ui';

type Mode = 'login' | 'register';
interface Pending {
  mode: Mode;
  reason?: string;
  then?: () => void;
}
interface AuthApi {
  /** Si hay sesión ejecuta `then`; si no, abre el acceso y lo ejecuta al terminar. */
  requireLogin: (reason: string, then?: () => void) => void;
  openAuth: (mode?: Mode) => void;
}

const Ctx = createContext<AuthApi>({ requireLogin: () => undefined, openAuth: () => undefined });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const requireLogin = useCallback((reason: string, then?: () => void) => {
    if (getSession()) then?.();
    else setPending({ mode: 'register', reason, then });
  }, []);
  const openAuth = useCallback((mode: Mode = 'login') => setPending({ mode }), []);

  return (
    <Ctx.Provider value={{ requireLogin, openAuth }}>
      {children}
      {pending && (
        <AuthDialog
          initial={pending}
          onClose={() => setPending(null)}
          onDone={() => {
            const then = pending.then;
            setPending(null);
            then?.();
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function AuthDialog({ initial, onClose, onDone }: { initial: Pending; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose, mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, countryFilter(getCountry()));
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" ref={dialog}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>
        <h2 id="auth-title" className="modal-title">
          {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
        </h2>
        {initial.reason && <p className="modal-reason">{initial.reason}</p>}
        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nombre completo</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && <small>Mínimo 8 caracteres.</small>}
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta y continuar'}
          </button>
        </form>
        <p className="modal-switch">
          {mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Créala gratis' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
