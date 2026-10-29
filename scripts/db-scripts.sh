#!/usr/bin/env bash
# Genera y valida los scripts de base de datos de cada microservicio:
#   db/01_schema.sql  esquema (DDL) generado desde prisma/schema.prisma
#   db/02_seed.sql    datos de ejemplo (escritos a mano, idempotentes)
#   db/03_backup.sql  respaldo (pg_dump) del schema con los datos de ejemplo cargados
# Requiere: PostgreSQL accesible en $PGURL, Node 20 y Docker (para pg_dump 16).
set -euo pipefail
PGURL="${PGURL:-postgresql://postgres:postgres@localhost:5432/coworkspace}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

declare -A SCHEMA=(
  [membership-service]=membership [space-service]=space [booking-service]=booking [billing-service]=billing
  [notification-service]=notification [access-control-service]=access [community-service]=community [analytics-service]=analytics
)
ORDER=(membership-service space-service booking-service billing-service notification-service access-control-service community-service analytics-service)

for svc in "${ORDER[@]}"; do
  s="${SCHEMA[$svc]}"
  dir="$ROOT/services/$svc"
  echo "::group::$svc ($s)"
  (cd "$dir" && npm ci --silent && npx prisma generate >/dev/null)
  ddl="$(cd "$dir" && npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script)"
  {
    echo "-- ============================================================"
    echo "-- CoworkSpace · $svc · esquema de base de datos"
    echo "-- Generado desde prisma/schema.prisma con 'prisma migrate diff'."
    echo "-- Cada microservicio usa su propio schema de PostgreSQL ($s)."
    echo "-- Uso: psql \"\$DATABASE_URL\" -f db/01_schema.sql -f db/02_seed.sql"
    echo "-- ============================================================"
    echo "CREATE SCHEMA IF NOT EXISTS \"$s\";"
    echo "SET search_path TO \"$s\";"
    echo
    echo "$ddl"
  } > "$dir/db/01_schema.sql"
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -c "DROP SCHEMA IF EXISTS \"$s\" CASCADE"
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$dir/db/01_schema.sql"
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$dir/db/02_seed.sql"
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$dir/db/02_seed.sql"   # idempotente: segunda ejecución sin errores
  echo "::endgroup::"
done

# Muestra de las bases de origen para correr Analytics solo (su docker-compose la carga primero)
{
  echo "-- Muestra de las bases de origen (Membership, Space, Booking y Billing) para correr Analytics solo."
  echo "-- Analytics las lee en SOLO LECTURA; en producción, SOURCE_DATABASE_URL apunta a la réplica de lectura."
  for src in membership-service space-service booking-service billing-service; do
    for f in 01_schema.sql 02_seed.sql; do
      echo; echo "-- ===== $src/db/$f ====="
      cat "$ROOT/services/$src/db/$f"
    done
  done
} > "$ROOT/services/analytics-service/db/00_source_sample.sql"

# El ETL de Analytics lee las bases de los demás servicios en solo lectura y calcula los KPIs
echo "::group::ETL de Analytics sobre los datos de ejemplo"
(cd "$ROOT/services/analytics-service" && npm run build --silent && \
  DATABASE_URL="$PGURL?schema=analytics" SOURCE_DATABASE_URL="$PGURL" node -e "
    const { PrismaClient } = require('@prisma/client');
    const { SourceDb } = require('./dist/clients/source.db');
    const { EtlService } = require('./dist/analytics/etl.service');
    (async () => {
      const prisma = new PrismaClient();
      const run = await new EtlService(prisma, new SourceDb()).run('manual');
      console.log('ETL', run.status, run.rows, 'filas');
      console.table(await prisma.revenueByPlan.findMany({ select: { period: true, planCode: true, totalRevenue: true } }));
      console.table(await prisma.memberRetention.findMany({ select: { cohort: true, members: true, retained: true } }));
      await prisma.\$disconnect();
      process.exit(run.status === 'OK' && run.rows > 0 ? 0 : 1);
    })().catch((e) => { console.error(e); process.exit(1); });
  ")
echo "::endgroup::"

for svc in "${ORDER[@]}"; do
  s="${SCHEMA[$svc]}"
  docker run --rm --network host postgres:16-alpine pg_dump "$PGURL" --schema="$s" --no-owner --no-privileges --inserts \
    | sed '/^-- Dumped/d' > "$ROOT/services/$svc/db/03_backup.sql"
  echo "$svc: $(grep -c '^INSERT' "$ROOT/services/$svc/db/03_backup.sql") filas respaldadas"
done
