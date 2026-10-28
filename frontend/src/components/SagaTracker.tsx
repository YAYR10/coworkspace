import { useEffect, useState } from 'react';
import { api, Booking, Charge } from '../api';
import { cancelReason, money } from '../format';
import { PayButton } from './PayButton';

type Phase = 'waiting' | 'payment' | 'confirmed' | 'cancelled' | 'slow';

/**
 * Sigue la saga de una reserva: Booking la crea PENDING, Billing decide el cobro
 * y Booking la confirma o la cancela (compensación). Consulta el estado cada 1,5 s.
 */
export function SagaTracker({ booking, onDone }: { booking: Booking; onDone?: () => void }) {
  const [current, setCurrent] = useState<Booking>(booking);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [phase, setPhase] = useState<Phase>('waiting');

  useEffect(() => {
    let alive = true;
    const started = Date.now();
    (async () => {
      while (alive) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const b = await api.get<Booking>(`/api/bookings/${booking.id}`);
          if (!alive) return;
          setCurrent(b);
          if (b.status !== 'PENDING') {
            const charges = await api.get<Charge[]>('/api/charges/me').catch(() => []);
            if (!alive) return;
            setCharge(charges.find((c) => c.bookingId === b.id) ?? null);
            setPhase(b.status === 'CONFIRMED' ? 'confirmed' : 'cancelled');
            onDone?.();
            return;
          }
          // Con pasarela real, Facturación deja el cobro PENDIENTE hasta que la persona pague
          if (Date.now() - started > 2500) {
            const pending = await api.get<Charge | null>(`/api/charges/booking/${b.id}`).catch(() => null);
            if (!alive) return;
            if (pending?.status === 'PENDING') {
              setCharge(pending);
              setPhase('payment');
              return;
            }
          }
        } catch {
          /* un fallo puntual no detiene el seguimiento */
        }
        if (Date.now() - started > 30_000) {
          if (alive) setPhase('slow');
          return;
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [booking.id, onDone]);

  const billingDone = phase === 'confirmed' || phase === 'cancelled';
  return (
    <ol className="saga" aria-live="polite">
      <li className="is-done">
        <strong>Reserva registrada</strong>
        <span>El horario quedó apartado mientras se revisa el cobro.</span>
      </li>
      <li className={billingDone ? 'is-done' : phase === 'slow' ? 'is-stuck' : 'is-active'}>
        <strong>Revisión del cobro</strong>
        <span>
          {phase === 'waiting' && 'Facturación está revisando si tu plan cubre este espacio…'}
          {phase === 'payment' && charge && (
            <>
              Tu plan no incluye este espacio: hay un cobro adicional de {money(charge.amount)}. Págalo en la pasarela segura de Wompi para confirmar la reserva.
              <PayButton bookingId={current.id} amount={charge.amount} />
            </>
          )}
          {phase === 'slow' && 'Está tardando más de lo normal. Revisa Mis reservas en un momento.'}
          {billingDone && !charge && 'Tu plan cubre este espacio: no hay cobro adicional.'}
          {billingDone && charge?.status === 'APPROVED' && `Cobro adicional aprobado por ${money(charge.amount)}.`}
          {billingDone && charge?.status === 'REJECTED' && `El cobro de ${money(charge.amount)} fue rechazado${charge.failureReason ? `: ${charge.failureReason}` : ''}.`}
          {billingDone && charge?.status === 'VOIDED' && `El cobro de ${money(charge.amount)} fue anulado.`}
        </span>
      </li>
      <li className={phase === 'confirmed' ? 'is-done' : phase === 'cancelled' ? 'is-failed' : ''}>
        <strong>{phase === 'cancelled' ? 'Reserva cancelada' : 'Reserva confirmada'}</strong>
        <span>
          {phase === 'confirmed' && 'Listo. La encuentras en Mis reservas.'}
          {phase === 'cancelled' && `${cancelReason(current.cancelReason)}. El horario quedó libre de nuevo.`}
          {(phase === 'waiting' || phase === 'slow') && 'Pendiente.'}
          {phase === 'payment' && 'Se confirma apenas se apruebe el pago. Si no pagas en unos minutos, el horario se libera.'}
        </span>
      </li>
    </ol>
  );
}
