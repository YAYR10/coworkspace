import { SOURCES } from '../clients/source.db';

const ident = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`Nombre de schema inválido: ${name}`);
  return `"${name}"`;
};

/**
 * Consultas de extracción. Prisma guarda las fechas como timestamp sin zona en UTC,
 * por eso se convierten a hora local (ANALYTICS_TZ) para las franjas horarias.
 * Parámetros comunes: $1 = días de ventana, $2 = zona horaria.
 */
export function queries() {
  const m = ident(SOURCES.membership);
  const s = ident(SOURCES.space);
  const b = ident(SOURCES.booking);
  const bi = ident(SOURCES.billing);
  return {
    locations: `
      SELECT l.id, l.name, l.city,
        (SELECT count(*) FROM ${s}.rooms r WHERE r.location_id = l.id AND r.is_active)::int
      + (SELECT count(*) FROM ${s}.desks d WHERE d.location_id = l.id AND d.is_active)::int AS resources
      FROM ${s}.locations l`,

    occupancy: `
      WITH b AS (
        SELECT location_id, start_time, end_time FROM ${b}.bookings
        WHERE status::text = 'CONFIRMED'
          AND end_time > (now() AT TIME ZONE 'UTC') - make_interval(days => $1::int)
          AND end_time > start_time
      ), slots AS (
        SELECT b.location_id, gs AS slot,
          EXTRACT(EPOCH FROM (LEAST(b.end_time, gs + interval '1 hour') - GREATEST(b.start_time, gs))) / 3600.0 AS hours
        FROM b, generate_series(date_trunc('hour', b.start_time), b.end_time - interval '1 microsecond', interval '1 hour') AS gs
      ), local AS (
        SELECT location_id, (slot AT TIME ZONE 'UTC') AT TIME ZONE $2 AS ts, hours FROM slots
      )
      SELECT location_id, to_char(ts, 'YYYY-MM-DD') AS day, EXTRACT(ISODOW FROM ts)::int AS weekday,
             EXTRACT(HOUR FROM ts)::int AS hour_slot, SUM(hours)::float AS booked_hours, COUNT(*)::int AS bookings
      FROM local GROUP BY 1, 2, 3, 4`,

    membershipRevenue: `
      SELECT substring(i.period, 1, 7) AS period, p.code AS plan_code, p.name AS plan_name,
             SUM(i.amount)::int AS revenue, COUNT(*)::int AS invoices, COUNT(DISTINCT i.member_id)::int AS members
      FROM ${bi}.invoices i
      JOIN ${m}.subscriptions su ON su.id = i.subscription_id
      JOIN ${m}.membership_plans p ON p.id = su.plan_id
      WHERE i.status::text = 'PAID'
      GROUP BY 1, 2, 3`,

    extraRevenue: `
      SELECT to_char((c.created_at AT TIME ZONE 'UTC') AT TIME ZONE $1, 'YYYY-MM') AS period,
             COALESCE(mp.plan_code, 'SIN_PLAN') AS plan_code, COALESCE(mp.plan_name, 'Sin membresía') AS plan_name,
             SUM(c.amount)::int AS revenue, COUNT(DISTINCT c.member_id)::int AS members
      FROM ${bi}.extra_charges c
      LEFT JOIN ${bi}.member_plans mp ON mp.member_id = c.member_id
      WHERE c.status::text = 'APPROVED' AND c.amount > 0
      GROUP BY 1, 2, 3`,

    retention: `
      WITH first AS (
        SELECT member_id, MIN(started_at) AS first_at FROM ${m}.subscriptions GROUP BY 1
      ), active AS (
        SELECT DISTINCT member_id FROM ${m}.subscriptions WHERE status::text = 'ACTIVE'
      )
      SELECT to_char(f.first_at, 'YYYY-MM') AS cohort, COUNT(*)::int AS members, COUNT(a.member_id)::int AS retained
      FROM first f LEFT JOIN active a ON a.member_id = f.member_id
      GROUP BY 1 ORDER BY 1`,

    activeMembers: `SELECT COUNT(DISTINCT member_id)::int AS n FROM ${m}.subscriptions WHERE status::text = 'ACTIVE'`,
  };
}
