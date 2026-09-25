import { useState } from 'react';
import { api, Me, Plan, Subscription } from '../api';
import { Loading, Notice, PageHead } from '../components/ui';
import { date, money } from '../format';
import { errorText, useLoad } from '../hooks';

const ACCESS: Record<string, string> = { ROOM: 'Salas de reunión', DESK: 'Puestos de trabajo' };
const STATUS: Record<Subscription['status'], string> = { ACTIVE: 'Activa', EXPIRED: 'Vencida', CANCELLED: 'Cancelada' };

export function MembershipView() {
  const me = useLoad(() => api.get<Me>('/api/members/me'));
  const plans = useLoad(() => api.get<Plan[]>('/api/plans'));
  const history = useLoad(() => api.get<Subscription[]>('/api/subscriptions/me'));
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const active = me.data?.subscriptions?.[0];

  const refresh = () => Promise.all([me.reload(), history.reload()]);

  const subscribe = async (p: Plan) => {
    setWorking(p.id);
    setMessage(null);
    try {
      await api.post('/api/subscriptions', { planId: p.id });
      setMessage({ tone: 'ok', text: `Te suscribiste a ${p.name}. La factura del primer mes aparece en Pagos.` });
      await refresh();
    } catch (e) {
      setMessage({ tone: 'error', text: errorText(e) });
    } finally {
      setWorking(null);
    }
  };

  const stopRenewal = async (s: Subscription) => {
    if (!window.confirm(`Tu plan ${s.plan.name} seguirá activo hasta el ${date(s.renewsAt)} y no se renovará. ¿Continuar?`)) return;
    setWorking(s.id);
    try {
      await api.post(`/api/subscriptions/${s.id}/cancel`);
      setMessage({ tone: 'ok', text: 'Renovación automática desactivada.' });
      await refresh();
    } catch (e) {
      setMessage({ tone: 'error', text: errorText(e) });
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <PageHead title="Membresía">Tu plan define qué espacios usas sin costo extra. Lo que no cubre se cobra por hora al reservar.</PageHead>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {me.loading && <Loading />}
      {me.error && <Notice tone="error">{me.error}</Notice>}

      {me.data && (
        <section className="current-plan">
          {active ? (
            <>
              <p className="current-label">Tu plan actual</p>
              <p className="current-name">{active.plan.name}</p>
              <p className="current-meta">
                Incluye {active.plan.resourceAccess.map((r) => ACCESS[r].toLowerCase()).join(' y ')}.{' '}
                {active.autoRenew ? `Se renueva el ${date(active.renewsAt)} por ${money(active.plan.price)}.` : `Vence el ${date(active.renewsAt)} y no se renovará.`}
              </p>
              {active.autoRenew && (
                <button className="btn btn-quiet" disabled={working === active.id} onClick={() => void stopRenewal(active)}>
                  Desactivar renovación
                </button>
              )}
            </>
          ) : (
            <>
              <p className="current-name">Aún no tienes plan</p>
              <p className="current-meta">Elige uno abajo. El cobro del primer mes se hace al suscribirte.</p>
            </>
          )}
        </section>
      )}

      <section className="block">
        <h2>Planes</h2>
        {plans.data && (
          <ul className="plans">
            {plans.data.map((p) => {
              const mine = active?.planId === p.id;
              return (
                <li key={p.id} className={`plan${mine ? ' is-mine' : ''}`}>
                  <h3>{p.name}</h3>
                  <p className="plan-price">
                    {money(p.price)} <small>al mes</small>
                  </p>
                  <p className="plan-desc">{p.description}</p>
                  <ul className="plan-access">
                    {p.resourceAccess.map((r) => (
                      <li key={r}>{ACCESS[r]}</li>
                    ))}
                  </ul>
                  {mine ? (
                    <p className="plan-mine">Es tu plan</p>
                  ) : (
                    <button className="btn btn-ghost" disabled={!!active || working === p.id} onClick={() => void subscribe(p)}>
                      {working === p.id ? 'Suscribiendo…' : 'Suscribirme'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {active && <p className="hint">Para cambiar de plan, primero debe vencer el actual.</p>}
      </section>

      {history.data && history.data.length > 0 && (
        <section className="block">
          <h2>Historial</h2>
          <ul className="rows rows-muted">
            {history.data.map((s) => (
              <li key={s.id} className="row">
                <div className="row-main">
                  <p className="row-title">{s.plan.name}</p>
                  <p className="row-sub">Desde el {date(s.startedAt)}</p>
                </div>
                <span className="tag">{STATUS[s.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
