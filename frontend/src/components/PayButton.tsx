import { useState } from 'react';
import { api, Checkout } from '../api';
import { money } from '../format';
import { errorText } from '../hooks';

/**
 * Lleva al checkout de Wompi para pagar el cobro adicional de una reserva.
 * Al terminar, Wompi devuelve a /pago?id=<transacción> y la página verifica el pago.
 */
export function PayButton({ bookingId, amount, compact }: { bookingId: string; amount?: number; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const checkout = await api.post<Checkout>(`/api/charges/booking/${bookingId}/checkout`);
      window.location.assign(checkout.checkoutUrl);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <span className={compact ? 'pay pay-compact' : 'pay'}>
      <button className="btn btn-primary" disabled={busy} onClick={() => void pay()}>
        {busy ? 'Abriendo la pasarela…' : amount ? `Pagar ${money(amount)}` : 'Pagar'}
      </button>
      {error && <span className="field-error" role="alert">{error}</span>}
    </span>
  );
}
