import { FormEvent, useState } from 'react';
import { api, login, Plan, register } from '../api';
import { Brand } from '../components/ServiceStatus';
import { Notice } from '../components/ui';
import { money } from '../format';
import { errorText, useLoad } from '../hooks';

const ACCESS: Record<string, string> = { ROOM: 'salas de reunión', DESK: 'puestos de trabajo' };

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const plans = useLoad(() => api.get<Plan[]>('/api/plans'));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <section className="auth-intro">
        <Brand />
        <h1 className="auth-title">Tu sala, a la hora que la necesitas.</h1>
        <p className="auth-lede">
          Reserva salas de reunión y puestos de trabajo en cualquier sede. Mira la disponibilidad por horas y recibe la
          confirmación al instante.
        </p>
        <h2 className="auth-plans-title">Planes mensuales</h2>
        {plans.data && (
          <ul className="plan-lines">
            {plans.data.map((p) => (
              <li key={p.id}>
                <span className="plan-line-name">{p.name}</span>
                <span className="plan-line-access">Incluye {p.resourceAccess.map((r) => ACCESS[r]).join(' y ')}</span>
                <span className="plan-line-price">{money(p.price)}</span>
              </li>
            ))}
          </ul>
        )}
        {plans.error && <Notice tone="error">{plans.error}</Notice>}
      </section>

      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="switch" role="tablist" aria-label="Acceso">
          <button role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>
            Iniciar sesión
          </button>
          <button role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>
            Crear cuenta
          </button>
        </div>
        <h2 id="auth-heading" className="visually-hidden">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nombre</span>
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
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}
