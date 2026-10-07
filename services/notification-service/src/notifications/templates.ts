import type { DomainEvent } from '../events/event-stream.service';
import type { Place } from '../clients/directory.client';

export interface Message {
  subject: string;
  /** Texto plano (se guarda y se muestra en la app) */
  text: string;
}

const TZ = process.env.APP_TIMEZONE ?? 'America/Bogota';
const day = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
const hour = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const when = (d: { startTime: string; endTime: string }) => `el ${day.format(new Date(d.startTime))}, de ${hour.format(new Date(d.startTime))} a ${hour.format(new Date(d.endTime))}`;
const where = (p: Place | null) => (p ? `${p.resource} en ${p.location}${p.address ? ` (${p.address})` : ''}` : 'tu espacio');

const CANCEL_REASON: Record<string, string> = {
  PAYMENT_REJECTED: 'No pudimos aprobar el cobro adicional, así que la reserva se canceló y el horario quedó libre.',
  SAGA_TIMEOUT: 'Facturación no respondió a tiempo, así que la reserva se canceló y el horario quedó libre.',
  CANCELLED_BY_STAFF: 'El equipo de la sede la canceló. Si tienes dudas, escríbenos respondiendo este correo.',
  CANCELLED_BY_MEMBER: 'La cancelaste desde la aplicación. El horario quedó libre para otras personas.',
};

/** Eventos que generan correo. Los demás se ignoran. */
export const HANDLED = ['booking.confirmed', 'booking.cancelled', 'booking.waitlist.promoted', 'membership.activated', 'membership.expired'];

export function buildMessage(event: DomainEvent, name: string, place: Place | null): Message | null {
  const d = event.data ?? {};
  const hi = `Hola ${name.split(' ')[0]},`;
  switch (event.type) {
    case 'booking.confirmed': {
      const extra = Number(d.extraCharge ?? 0);
      return {
        subject: `Reserva confirmada: ${place?.resource ?? 'tu espacio'}, ${day.format(new Date(d.startTime))}`,
        text: [
          hi,
          `tu reserva de ${where(place)} ${when(d)} está confirmada.`,
          extra > 0 ? `Como tu plan no incluye este espacio, se cobró un adicional de ${money.format(extra)}.` : 'Está incluida en tu plan, sin costo adicional.',
        ].join('\n\n'),
      };
    }
    case 'booking.cancelled': {
      const byMember = d.reason === 'CANCELLED_BY_MEMBER';
      return {
        subject: byMember ? 'Cancelaste tu reserva' : `Tu reserva de ${place?.resource ?? 'espacio'} fue cancelada`,
        text: [hi, `tu reserva de ${where(place)} ${when(d)} quedó cancelada.`, CANCEL_REASON[d.reason] ?? ''].filter(Boolean).join('\n\n'),
      };
    }
    case 'booking.waitlist.promoted':
      return {
        subject: 'Se liberó el horario que esperabas',
        text: [hi, 'se liberó el espacio por el que estabas en lista de espera y creamos la reserva a tu nombre.', 'Te avisaremos cuando quede confirmada.'].join('\n\n'),
      };
    case 'membership.activated':
      return {
        subject: d.isRenewal ? `Renovamos tu plan ${d.planName}` : `Bienvenido a CoworkSpace: plan ${d.planName}`,
        text: [
          hi,
          d.isRenewal
            ? `renovamos tu plan ${d.planName} por ${money.format(Number(d.price ?? 0))}.`
            : `tu plan ${d.planName} ya está activo. Ya puedes reservar desde la aplicación.`,
          `La próxima renovación es el ${day.format(new Date(d.renewsAt))}.`,
        ].join('\n\n'),
      };
    case 'membership.expired':
      return {
        subject: 'Tu plan venció',
        text: [hi, 'tu plan llegó a su fin y no se renovó.', 'Puedes elegir un plan nuevo cuando quieras desde la sección Membresía.'].join('\n\n'),
      };
    default:
      return null;
  }
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML sencillo y compatible con clientes de correo (estilos en línea). */
export function toHtml(msg: Message): string {
  const app = process.env.APP_URL ?? 'https://coworkspace-web.onrender.com';
  const paragraphs = msg.text
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#17202E">${escape(p)}</p>`)
    .join('');
  return `<!doctype html><html lang="es"><body style="margin:0;background:#EEF1F4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#17202E">CoworkSpace</p>
  <div style="background:#ffffff;border:1px solid #D3DAE3;border-radius:8px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#17202E">${escape(msg.subject)}</h1>
    ${paragraphs}
    <a href="${app}" style="display:inline-block;margin-top:6px;background:#17202E;color:#ffffff;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:4px">Abrir CoworkSpace</a>
  </div>
  <p style="margin:16px 0 0;font-size:12px;color:#5B6778">Recibes este correo porque tienes una cuenta en CoworkSpace.</p>
</div></body></html>`;
}
