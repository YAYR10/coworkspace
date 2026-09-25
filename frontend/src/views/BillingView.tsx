import { api, Charge, Invoice } from '../api';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { date, money } from '../format';
import { useLoad } from '../hooks';

const CHARGE: Record<Charge['status'], string> = { APPROVED: 'Aprobado', REJECTED: 'Rechazado', VOIDED: 'Anulado' };

export function BillingView() {
  const invoices = useLoad(() => api.get<Invoice[]>('/api/invoices/me'));
  const charges = useLoad(() => api.get<Charge[]>('/api/charges/me'));

  return (
    <>
      <PageHead title="Pagos">Facturas mensuales de tu plan y cobros por horas de espacios que tu plan no cubre.</PageHead>

      <section className="block">
        <h2>Facturas</h2>
        {invoices.loading && <Loading />}
        {invoices.error && <Notice tone="error">{invoices.error}</Notice>}
        {invoices.data && invoices.data.length === 0 && <Empty title="Sin facturas">Aparecen cuando te suscribes a un plan.</Empty>}
        {invoices.data && invoices.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Periodo</th><th>Factura electrónica</th><th>Estado</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {invoices.data.map((i) => (
                  <tr key={i.id}>
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
        {charges.data && charges.data.length === 0 && <Empty title="Sin cobros adicionales">Si reservas un espacio que tu plan no incluye, el cobro aparece aquí.</Empty>}
        {charges.data && charges.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Concepto</th><th>Estado</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {charges.data.map((c) => (
                  <tr key={c.id}>
                    <td>{date(c.createdAt)}</td>
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
