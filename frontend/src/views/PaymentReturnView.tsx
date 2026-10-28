import { useEffect, useState } from 'react';
import { api, PaymentResult } from '../api';
import { Loading, Notice } from '../components/ui';
import { useAuth } from '../components/Auth';
import { money } from '../format';
import { errorText, useSession } from '../hooks';
import { navigate } from '../router';

/** Wompi devuelve aquí (/pago?id=<transacción>). Se verifica el pago con Facturación y la saga sigue sola. */
export function PaymentReturnView() {
  const session = useSession();
  const { requireLogin } = useAuth();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transactionId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!transactionId || !session) return;
    let alive = true;
    (async () => {
      // Wompi puede tardar unos segundos en pasar de PENDING a APPROVED/DECLINED
      for (let i = 0; i < 6 && alive; i++) {
        try {
          const r = await api.post<PaymentResult>('/api/payments/wompi/verify', { transactionId });
          if (!alive) return;
          setResult(r);
          if (r.transactionStatus !== 'PENDING' && (r.kind !== 'plan' || r.status !== 'APPROVED' || r.activated)) return;
        } catch (e) {
          if (alive) setError(errorText(e));
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => {
      alive = false;
    };
  }, [transactionId, session?.member.id]);

  const isPlan = result?.kind === 'plan';
  const leave = () => {
    window.history.replaceState(null, '', '/');
    navigate(isPlan ? '/cuenta/membresia' : '/cuenta/reservas');
  };

  const approved = result?.status === 'APPROVED';
  const rejected = result && ['REJECTED', 'VOIDED'].includes(result.status);

  return (
    <div className="container page-pad">
      <div className="pay-result">
        <h1>Resultado del pago</h1>
        {!transactionId && <Notice tone="error">No recibimos el número de la transacción.</Notice>}
        {transactionId && !session && (
          <Notice>
            Inicia sesión para ver el resultado de tu pago.{' '}
            <button className="btn btn-quiet" onClick={() => requireLogin('Inicia sesión para ver el resultado de tu pago')}>Iniciar sesión</button>
          </Notice>
        )}
        {transactionId && session && !result && !error && <Loading label="Verificando el pago con Wompi…" />}
        {error && <Notice tone="error">{error}</Notice>}
        {result && result.transactionStatus === 'PENDING' && (
          <Notice>Wompi aún está procesando el pago. {isPlan ? 'Tu plan' : 'Tu reserva'} se activará sola apenas se apruebe.</Notice>
        )}
        {approved && !isPlan && <Notice tone="ok">Pago aprobado por {money(result.amount)}. Tu reserva quedó confirmada y te enviamos el correo.</Notice>}
        {approved && isPlan && (
          <Notice tone="ok">
            Pago aprobado por {money(result.amount)}.{' '}
            {result.activated
              ? `Tu plan ${result.planName} ya está activo y la factura electrónica aparece en Pagos.`
              : `Estamos activando tu plan ${result.planName}; recarga en unos segundos.`}
          </Notice>
        )}
        {rejected && !isPlan && (
          <Notice tone="error">
            El pago no fue aprobado{result.message ? `: ${result.message}` : ''}. La reserva se canceló y el horario quedó libre; puedes intentarlo de nuevo.
          </Notice>
        )}
        {rejected && isPlan && (
          <Notice tone="error">El pago no fue aprobado{result.message ? `: ${result.message}` : ''}. Tu plan no se activó; puedes intentarlo de nuevo.</Notice>
        )}
        <p className="pay-ref">Transacción {transactionId}</p>
        <button className="btn btn-primary" onClick={leave}>{isPlan ? 'Ir a mi membresía' : 'Ir a mis reservas'}</button>
      </div>
    </div>
  );
}
