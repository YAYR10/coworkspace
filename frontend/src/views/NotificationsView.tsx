import { useState } from 'react';
import { api, AppNotification } from '../api';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { date, time } from '../format';
import { useLoad } from '../hooks';

/** Avisos que el Notification Service le envió al usuario (reservas confirmadas, canceladas, plan activo…). */
export function NotificationsView() {
  const list = useLoad(() => api.get<AppNotification[]>('/api/notifications/me'));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PageHead title="Notificaciones">Los avisos que te enviamos por correo cuando una reserva se confirma o se cancela, o cuando cambia tu plan.</PageHead>
      <div className="block-head">
        <span />
        <button className="btn btn-quiet" onClick={() => void list.reload()}>Actualizar</button>
      </div>
      {list.loading && !list.data && <Loading />}
      {list.error && <Notice tone="error">{list.error}</Notice>}
      {list.data && list.data.length === 0 && (
        <Empty title="Aún no tienes notificaciones">Cuando reserves o te suscribas a un plan, los avisos aparecerán aquí y en tu correo.</Empty>
      )}
      {list.data && list.data.length > 0 && (
        <ul className="rows">
          {list.data.map((n) => (
            <li key={n.id} className="row row-notice">
              <button className="row-main row-btn" aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? null : n.id)}>
                <span className="row-title">{n.subject}</span>
                <span className="row-sub">{date(n.createdAt)}, {time(n.createdAt)}</span>
                {open === n.id && <span className="notice-body">{n.body}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
