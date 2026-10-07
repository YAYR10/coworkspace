import { useState } from 'react';
import { api, AppNotification, MemberRow, NotificationStatus } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { date, time } from '../../format';
import { useLoad } from '../../hooks';

const STATUS: Record<NotificationStatus, { label: string; cls: string }> = {
  SENT: { label: 'Enviado', cls: 'tag-confirmed' },
  LOGGED: { label: 'Registrado (demo)', cls: 'tag-hidden' },
  FAILED: { label: 'Falló', cls: 'tag-cancelled' },
};
const EVENT: Record<string, string> = {
  'booking.confirmed': 'Reserva confirmada',
  'booking.cancelled': 'Reserva cancelada',
  'booking.waitlist.promoted': 'Lista de espera',
  'membership.activated': 'Plan activado',
  'membership.expired': 'Plan vencido',
};

/** Solo administrador: correos generados por el Notification Service a partir de los eventos. */
export function MailView() {
  const status = useLoad(() => api.get<{ mode: 'email' | 'demo'; from: string | null }>('/api/notifications/status'));
  const list = useLoad(() => api.get<AppNotification[]>('/api/notifications'));
  const members = useLoad(() => api.get<MemberRow[]>('/api/members'));
  const [open, setOpen] = useState<string | null>(null);
  const name = (id?: string) => members.data?.find((m) => m.id === id)?.name ?? '';

  return (
    <>
      <PageHead title="Correos">
        El servicio de notificaciones escucha los eventos de reservas y membresías y envía un correo por cada uno.
      </PageHead>

      {status.error && <Notice tone="error">El servicio de notificaciones no responde todavía. {status.error}</Notice>}
      {status.data?.mode === 'email' && <Notice tone="ok">Envío real activo. Los correos salen desde {status.data.from} a través de Brevo.</Notice>}
      {status.data?.mode === 'demo' && (
        <Notice>
          Modo demostración: los correos se generan y se guardan aquí, pero no se envían. Para enviarlos de verdad, crea una cuenta gratis en
          Brevo y configura BREVO_API_KEY y MAIL_FROM en el servicio coworkspace-notification de Render.
        </Notice>
      )}

      <div className="block-head">
        <h2>Últimos correos</h2>
        <button className="btn btn-quiet" onClick={() => void list.reload()}>Actualizar</button>
      </div>
      {list.loading && !list.data && <Loading />}
      {list.data && list.data.length === 0 && <Empty title="Aún no hay correos">Aparecen cuando alguien reserva o se suscribe a un plan.</Empty>}
      {list.data && list.data.length > 0 && (
        <ul className="rows">
          {list.data.map((n) => (
            <li key={n.id} className="row row-notice">
              <button className="row-main row-btn" aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? null : n.id)}>
                <span className="row-title">{n.subject}</span>
                <span className="row-sub row-plain">
                  {EVENT[n.eventType] ?? n.eventType}, para {name(n.memberId) || n.email} ({n.email}), {date(n.createdAt)} {time(n.createdAt)}
                </span>
                {open === n.id && <span className="notice-body">{n.body}</span>}
                {open === n.id && n.error && <span className="notice-body notice-error">{n.error}</span>}
              </button>
              <span className={`tag ${STATUS[n.status].cls}`}>{STATUS[n.status].label}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
