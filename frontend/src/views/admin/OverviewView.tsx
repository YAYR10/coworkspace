import { api, Booking, Charge, Invoice, Location, MemberRow } from '../../api';
import { Loading, Notice, PageHead, StatusTag } from '../../components/ui';
import { money, plural, shortDay, time } from '../../format';
import { useLoad } from '../../hooks';

/** Resumen del jefe administrador: personas, sedes, ocupación e ingresos. */
export function OverviewView({ onGoTo }: { onGoTo: (id: string) => void }) {
  const data = useLoad(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const week = new Date(start.getTime() + 7 * 86_400_000);
    const [members, locations, bookings, invoices, charges] = await Promise.all([
      api.get<MemberRow[]>('/api/members'),
      api.get<Location[]>('/api/locations?all=true'),
      api.get<Booking[]>(`/api/bookings?from=${start.toISOString()}&to=${week.toISOString()}`),
      api.get<Invoice[]>('/api/invoices'),
      api.get<Charge[]>('/api/charges'),
    ]);
    return { members, locations, bookings, invoices, charges };
  });

  if (data.loading) return <Loading label="Preparando el resumen…" />;
  if (data.error || !data.data) return <Notice tone="error">{data.error ?? 'No se pudo cargar el resumen.'}</Notice>;
  const { members, locations, bookings, invoices, charges } = data.data;

  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = (iso: string) => iso.slice(0, 7) === month;
  const revenue =
    invoices.filter((i) => i.status === 'PAID' && thisMonth(i.createdAt)).reduce((s, i) => s + i.amount, 0) +
    charges.filter((c) => c.status === 'APPROVED' && thisMonth(c.createdAt)).reduce((s, c) => s + c.amount, 0);
  const byRole = (r: string) => members.filter((m) => m.role === r).length;
  const countries = new Set(locations.map((l) => l.country.toLowerCase())).size;
  const active = bookings.filter((b) => b.status !== 'CANCELLED');
  const next = [...active].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 6);

  return (
    <>
      <PageHead title="Resumen">Cómo va CoworkSpace hoy.</PageHead>

      <dl className="ledger">
        <button className="ledger-item" onClick={() => onGoTo('usuarios')}>
          <dt>Usuarios</dt>
          <dd>{members.length}</dd>
          <span>{plural(byRole('ADMIN'), 'administrador', 'administradores')}, {plural(byRole('COORDINATOR'), 'coordinador', 'coordinadores')}, {plural(byRole('MEMBER'), 'miembro', 'miembros')}</span>
        </button>
        <button className="ledger-item" onClick={() => onGoTo('sedes')}>
          <dt>Sedes publicadas</dt>
          <dd>{locations.filter((l) => l.isPublished).length}</dd>
          <span>en {plural(countries, 'país', 'países')}, {plural(locations.filter((l) => !l.isPublished).length, 'oculta', 'ocultas')}</span>
        </button>
        <button className="ledger-item" onClick={() => onGoTo('ocupacion')}>
          <dt>Reservas, próximos 7 días</dt>
          <dd>{active.length}</dd>
          <span>{plural(active.filter((b) => b.status === 'PENDING').length, 'pendiente', 'pendientes')} de cobro</span>
        </button>
        <button className="ledger-item" onClick={() => onGoTo('facturacion')}>
          <dt>Ingresos del mes</dt>
          <dd>{money(revenue)}</dd>
          <span>facturas pagadas y cobros aprobados</span>
        </button>
      </dl>

      <section className="block">
        <div className="block-head">
          <h2>Próximas reservas</h2>
          <button className="btn btn-quiet" onClick={() => onGoTo('ocupacion')}>Ver ocupación</button>
        </div>
        {next.length === 0 ? (
          <p className="hint">No hay reservas en los próximos 7 días.</p>
        ) : (
          <ul className="rows">
            {next.map((b) => (
              <li key={b.id} className="row">
                <div className="row-main">
                  <p className="row-title cap">{shortDay(b.startTime)}, {time(b.startTime)} a {time(b.endTime)}</p>
                  <p className="row-sub">
                    {members.find((m) => m.id === b.memberId)?.name ?? 'Miembro'} en {locations.find((l) => l.id === b.locationId)?.name ?? 'una sede'}
                  </p>
                </div>
                <StatusTag status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
