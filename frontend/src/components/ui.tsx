import { ReactNode } from 'react';
import type { BookingStatus } from '../api';

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  return <p className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <p className="loading" role="status">{label}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

const STATUS: Record<BookingStatus, string> = { PENDING: 'Pendiente de cobro', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada' };
export function StatusTag({ status }: { status: BookingStatus }) {
  return <span className={`tag tag-${status.toLowerCase()}`}>{STATUS[status]}</span>;
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children && <p className="page-lede">{children}</p>}
    </header>
  );
}
