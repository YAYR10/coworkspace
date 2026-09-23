#!/bin/sh
set -e
# Cada microservicio usa su propio schema de PostgreSQL (database-per-service lógico).
if [ -n "$DB_SCHEMA" ]; then
  case "$DATABASE_URL" in
    *schema=*) ;;
    *\?*) export DATABASE_URL="${DATABASE_URL}&schema=${DB_SCHEMA}" ;;
    *) export DATABASE_URL="${DATABASE_URL}?schema=${DB_SCHEMA}" ;;
  esac
fi
echo "Sincronizando esquema de base de datos (${DB_SCHEMA:-public})..."
npx prisma db push --skip-generate
exec node dist/main.js
