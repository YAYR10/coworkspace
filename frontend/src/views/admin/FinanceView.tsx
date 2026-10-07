import { useMemo } from 'react';
import { api, Charge, Invoice, MemberRow } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { date, money } from '../../format';
import { useLoad } from '../../hooks';

const CHARGE: Record<Charge['status'], string> = { APPROVED: 'Aprobado', REJECTED: 'Rechazado', VOIDED: 'Anulado' };

/** Solo administrador: facturas y cobros de todos los miembros. */
export function FinanceView() {
  const invoices = useLoad(() => api.get<Invoice[]>('/api/invoices'));
  const charges = useLoad(() => api.get<Charge[]>('/api/charges'));
  const members = useLoad(() => api.get<MemberRow[]>('/api/members'));
  const who = useMemo(() => Object.fromEntries((members.data ?? []).map((m) => [m.id, m.name])) as Record<string, string>, [members.data]);
  const name = (id: string) => who[id] ?? 'Miembro';

  const paid = (invoices.data ?? []).filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const approved = (charges.data ?? []).filter((c) => c.status === 'APPROVED').reduce((s, c) => s + c.amount, 0);
  const rejected = (charges.data ?? []).filter((c) => c.status === 'REJECTED').length;

  return (
    <>
      <PageHead title="Facturación">Facturas mensuales de los planes y cobros por horas de todos los miembros.</PageHead>

      {invoices.data && charges.data && (
        <p className="figures">
          <span><strong>{money(paid + approved)}</strong> recaudado</span>
          <span><strong>{money(paid)}</strong> en planes</span>
          <span><strong>{money(approved)}</strong> en cobros por horas</span>
          <span><strong>{rejected}</strong> {rejected === 1 ? 'cobro rechazado' : 'cobros rechazados'}</span>
        </p>
      )}

      <section className="block">
        <h2>Facturas</h2>
        {invoices.loading && <Loading />}
        {invoices.error && <Notice tone="error">{invoices.error}</Notice>}
        {invoices.data?.length === 0 && <Empty title="Aún no hay facturas" />}
        {!!invoices.data?.length && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Miembro</th><th>Periodo</th><th>Factura electrónica</th><th>Estado</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {invoices.data.map((i) => (
                  <tr key={i.id}>
                    <td>{name(i.memberId)}</td>
                    <td>{i.period}</td>
                    <td>{i.electronicNumber ?? '—'}</td>
                    <td>{i.status === 'PAID' ? 'Pagada' : `Fallida${i.failureReason ? `: ${i.failureReason}` : ''}`}</td>
                    <td className="num">{money(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="block">
        <h2>Cobros por reservas</h2>
        {charges.loading && <Loading />}
        {charges.error && <Notice tone="error">{charges.error}</Notice>}
        {charges.data?.length === 0 && <Empty title="Aún no hay cobros adicionales" />}
        {!!charges.data?.length && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Miembro</th><th>Concepto</th><th>Estado</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {charges.data.map((c) => (
                  <tr key={c.id}>
                    <td className="nowrap">{date(c.createdAt)}</td>
                    <td>{name(c.memberId)}</td>
                    <td>{c.reason}</td>
                    <td>{CHARGE[c.status]}{c.failureReason ? `: ${c.failureReason}` : ''}</td>
                    <td className="num">{money(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
