-- Analytics no tiene datos propios de origen: sus tablas las llena el ETL leyendo
-- (en solo lectura) las bases de los demás servicios. Este script deja una ejecución
-- de ejemplo; para calcular los KPIs reales ejecuta POST /api/analytics/etl o espera al cron.
SET search_path TO analytics;

INSERT INTO etl_runs (id, trigger, status, started_at, finished_at, duration_ms, rows, error) VALUES
  ('99000000-0000-4000-8000-000000000001', 'manual', 'OK', now() - interval '1 hour', now() - interval '1 hour' + interval '180 milliseconds', 180, 0, NULL)
ON CONFLICT (id) DO NOTHING;
