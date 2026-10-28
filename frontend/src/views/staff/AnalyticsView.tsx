import { useState } from 'react';
import { AnalyticsSummary, api, EtlRun, OccupancyKpi, RetentionKpi, RevenueKpi } from '../../api';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { date, hourLabel, money, time } from '../../format';
import { errorText, useLoad } from '../../hooks';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const pct = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

/** Bar list horizontal de una sola serie: el título nombra la medida, cada barra tiene su valor escrito. */
function Bars({ rows, max, format }: { rows: { label: string; value: number; sub?: string }[]; max?: number; format: (n: number) => string }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}${r.sub ? ` · ${r.sub}` : ''}`}>
          <span className="bars-label">{r.label}</span>
          <span className="bars-track"><i style={{ width: `${Math.max(1.5, (r.value / top) * 100)}%` }} /></span>
          <span className="bars-value">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Mapa de calor día × hora con una sola tonalidad (más oscuro = más ocupado). */
function Heatmap({ cells }: { cells: OccupancyKpi['heatmap'] }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const max = Math.max(1, ...cells.map((c) => c.occupancyRate));
  const at = (d: number, h: number) => cells.find((c) => c.weekday === d && c.hour === h)?.occupancyRate ?? 0;
  return (
    <div className="heat-wrap">
      <table className="heat">
        <thead>
          <tr><th />{hours.map((h) => <th key={h} scope="col">{h % 2 ? '' : hourLabel(h)}</th>)}</tr>
        </thead>
        <tbody>
          {DAYS.map((d, i) => (
            <tr key={d}>
              <th scope="row">{d}</th>
              {hours.map((h) => {
                const v = at(i + 1, h);
                return (
                  <td key={h} title={`${d} ${hourLabel(h)}: ${pct(v)} de ocupación`}>
                    <i style={{ opacity: v ? 0.12 + 0.88 * (v / max) : 0 }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="heat-legend"><span>Menos ocupado</span><i /><span>Más ocupado</span></p>
    </div>
  );
}

/** Tablero de KPIs calculados por el Analytics Service (ETL periódico). */
export function AnalyticsView({ isAdmin }: { isAdmin: boolean }) {
  const [days, setDays] = useState(30);
  const summary = useLoad(() => api.get<AnalyticsSummary>('/api/analytics/summary'));
  const occupancy = useLoad(() => api.get<OccupancyKpi>(`/api/analytics/occupancy?days=${days}`), [days]);
  const retention = useLoad(() => api.get<RetentionKpi>('/api/analytics/retention'));
  const revenue = useLoad(() => (isAdmin ? api.get<RevenueKpi>('/api/analytics/revenue') : Promise.resolve(null)));
  const runs = useLoad(() => api.get<EtlRun[]>('/api/analytics/etl/runs'));
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const runEtl = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const r = await api.post<EtlRun>('/api/analytics/etl');
      setMsg({ tone: 'ok', text: `KPIs recalculados: ${r.rows} filas en ${r.durationMs} ms.` });
      await Promise.all([summary.reload(), occupancy.reload(), retention.reload(), revenue.reload(), runs.reload()]);
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setRunning(false);
    }
  };

  const s = summary.data;
  const o = occupancy.data;
  return (
    <>
      <PageHead title="Analítica">
        Ocupación por sede y franja horaria, ingresos por tipo de membresía y retención de miembros. Se recalcula cada 30 minutos.
      </PageHead>

      {summary.error && <Notice tone="error">{summary.error}</Notice>}
      {summary.loading && !s && <Loading label="Calculando indicadores…" />}
      {s && (
        <dl className="ledger">
          <div className="ledger-item"><dt>Ocupación, 30 días</dt><dd>{pct(s.occupancyRate30d)}</dd><span>{s.bookedHours30d.toLocaleString('es-CO')} horas reservadas</span></div>
          <div className="ledger-item"><dt>Hora pico</dt><dd>{s.peakHour ? hourLabel(s.peakHour.hour) : '–'}</dd><span>{s.topLocation ? `sede más ocupada: ${s.topLocation.name}` : 'sin reservas aún'}</span></div>
          <div className="ledger-item"><dt>Miembros activos</dt><dd>{s.activeMembers ?? '–'}</dd><span>retención {pct(s.retentionRate)}</span></div>
          {s.revenue ? (
            <div className="ledger-item"><dt>Ingresos del mes</dt><dd>{money(s.revenue.thisMonth)}</dd><span>{s.revenue.topPlan ? `plan líder: ${s.revenue.topPlan.planName}` : 'sin ingresos aún'}</span></div>
          ) : (
            <div className="ledger-item"><dt>Último cálculo</dt><dd>{s.lastEtlAt ? time(s.lastEtlAt) : '–'}</dd><span>{s.lastEtlAt ? date(s.lastEtlAt) : 'pendiente'}</span></div>
          )}
        </dl>
      )}

      <section className="block">
        <div className="block-head">
          <h2>Ocupación</h2>
          <div className="switch" role="tablist" aria-label="Periodo">
            {[7, 30, 90].map((d) => <button key={d} role="tab" aria-selected={days === d} onClick={() => setDays(d)}>{d} días</button>)}
          </div>
        </div>
        {occupancy.loading && !o && <Loading />}
        {occupancy.error && <Notice tone="error">{occupancy.error}</Notice>}
        {o && o.byLocation.length === 0 && <Empty title="Aún no hay reservas confirmadas en este periodo" />}
        {o && o.byLocation.length > 0 && (
          <div className="kpi-grid">
            <div>
              <h3>Por sede</h3>
              <Bars rows={o.byLocation.map((l) => ({ label: l.name, value: l.occupancyRate, sub: `${l.bookedHours} h en ${l.bookings} franjas` }))} max={Math.max(...o.byLocation.map((l) => l.occupancyRate), 1)} format={pct} />
            </div>
            <div>
              <h3>Por franja horaria</h3>
              <Bars rows={o.byHour.map((h) => ({ label: hourLabel(h.hour), value: h.occupancyRate }))} format={pct} />
            </div>
            <div className="kpi-wide">
              <h3>Semana típica</h3>
              <Heatmap cells={o.heatmap} />
            </div>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="block">
          <h2>Ingresos por tipo de membresía</h2>
          {revenue.loading && !revenue.data && <Loading />}
          {revenue.error && <Notice tone="error">{revenue.error}</Notice>}
          {revenue.data && revenue.data.rows.length === 0 && <Empty title="Aún no hay ingresos registrados" />}
          {revenue.data && revenue.data.rows.length > 0 && (
            <>
              <Bars rows={revenue.data.byPlan.map((p) => ({ label: p.planName, value: p.total, sub: `mensualidades ${money(p.membership)}, adicionales ${money(p.extra)}` }))} format={money} />
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Mes</th><th>Plan</th><th className="num">Mensualidades</th><th className="num">Adicionales</th><th className="num">Total</th></tr></thead>
                  <tbody>
                    {[...revenue.data.rows].reverse().map((r) => (
                      <tr key={`${r.period}-${r.planCode}`}>
                        <td>{r.period}</td><td>{r.planName}</td>
                        <td className="num">{money(r.membershipRevenue)}</td><td className="num">{money(r.extraRevenue)}</td><td className="num">{money(r.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <section className="block">
        <h2>Retención por cohorte</h2>
        <p className="hint">Miembros agrupados por el mes de su primera membresía y cuántos siguen con un plan activo.</p>
        {retention.error && <Notice tone="error">{retention.error}</Notice>}
        {retention.data && retention.data.cohorts.length === 0 && <Empty title="Aún no hay membresías" />}
        {retention.data && retention.data.cohorts.length > 0 && (
          <Bars
            rows={retention.data.cohorts.map((c) => ({ label: c.cohort, value: c.retentionRate * 100, sub: `${c.retained} de ${c.members} siguen activos` }))}
            max={100}
            format={pct}
          />
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Ejecuciones del ETL</h2>
          {isAdmin && <button className="btn btn-ghost" disabled={running} onClick={() => void runEtl()}>{running ? 'Recalculando…' : 'Recalcular ahora'}</button>}
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {runs.data && runs.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Inicio</th><th>Origen</th><th>Estado</th><th className="num">Filas</th><th className="num">Duración</th></tr></thead>
              <tbody>
                {runs.data.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>{date(r.startedAt)}, {time(r.startedAt)}</td>
                    <td>{{ cron: 'Programado', manual: 'Manual', startup: 'Al iniciar' }[r.trigger] ?? r.trigger}</td>
                    <td><span className={`tag ${r.status === 'OK' ? 'tag-confirmed' : r.status === 'FAILED' ? 'tag-cancelled' : 'tag-pending'}`}>{r.status === 'OK' ? 'Correcto' : r.status === 'FAILED' ? 'Falló' : 'En curso'}</span></td>
                    <td className="num">{r.rows}</td>
                    <td className="num">{r.durationMs != null ? `${r.durationMs} ms` : '–'}</td>
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
