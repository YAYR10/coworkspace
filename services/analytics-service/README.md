# Analytics Service

[![analytics-service](https://github.com/YAYR10/coworkspace/actions/workflows/svc-analytics-service.yml/badge.svg)](https://github.com/YAYR10/coworkspace/actions/workflows/svc-analytics-service.yml)

KPIs de negocio: ocupación por sede y franja horaria, ingresos por tipo de membresía y retención de miembros.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-analytics.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3008 |
| Base de datos | PostgreSQL, schema propio `analytics` |

## Responsabilidad

- ETL periódico (cada 30 min, al iniciar y bajo demanda) que lee en SOLO LECTURA las bases de Membership, Space, Booking y Billing (réplica de lectura).
- La conexión de origen se abre con default_transaction_read_only=on: Analytics nunca puede modificar datos de otro servicio.
- Guarda los KPIs ya calculados en sus propias tablas; las consultas del tablero son baratas.
- Ingresos solo visibles para el administrador.

## Tecnologías

NestJS 10 · TypeScript · Prisma 5 · PostgreSQL 16 · Redis 7 (eventos) · Jest · Docker · Prometheus (`/metrics`)

## Instalación y ejecución

```bash
cp .env.example .env              # ajusta los valores
npm ci
npx prisma generate
npx prisma db push                # o: psql "$DATABASE_URL" -f db/01_schema.sql
psql "$DATABASE_URL" -f db/02_seed.sql   # datos de ejemplo (opcional)
npm run start:dev
```

Con Docker (todo el sistema): `docker compose up --build` desde la raíz del proyecto.

```bash
npm test         # pruebas unitarias (Jest)
npm run lint     # ESLint
npm run build    # compila a dist/
```

## Endpoints

Todas las rutas se consumen a través del API Gateway (prefijo `/api`), que valida el JWT y reenvía la identidad en los headers `x-user-*`. El servicio rechaza llamadas que no traigan la `INTERNAL_API_KEY`. Las rutas **Interno** solo las usan otros microservicios y el Gateway no las expone.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/analytics/summary` | Coordinador | Indicadores principales |
| GET | `/api/analytics/occupancy` | Coordinador | Ocupación por sede, franja y día (days, locationId) |
| GET | `/api/analytics/revenue` | Admin | Ingresos por plan y mes |
| GET | `/api/analytics/retention` | Coordinador | Retención por cohorte |
| POST | `/api/analytics/etl` | Admin | Ejecutar el ETL ahora |
| GET | `/api/analytics/etl/runs` | Coordinador | Historial de ejecuciones |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

No publica ni consume eventos; se comunica por REST.

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `occupancy_by_location`, `revenue_by_plan`, `member_retention`, `etl_runs`.

| Archivo | Contenido |
|---|---|
| `prisma/schema.prisma` | Modelo de datos (fuente de verdad) |
| `db/01_schema.sql` | Script del esquema (generado con `prisma migrate diff`) |
| `db/02_seed.sql` | Datos de ejemplo, idempotentes |
| `db/03_backup.sql` | Respaldo (`pg_dump`) con los datos de ejemplo |

Restaurar el respaldo: `psql "$DATABASE_URL" -f db/03_backup.sql`. Los scripts se regeneran y validan con el workflow *Scripts de base de datos* (`scripts/db-scripts.sh`).

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto HTTP | `3008` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `analytics` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `analytics-service` |
| `SOURCE_DATABASE_URL` | Réplica de solo lectura de las bases de los demás servicios | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `ANALYTICS_ETL_CRON` | Frecuencia del ETL (cron con segundos) | `0 */30 * * * *` |
| `ANALYTICS_WINDOW_DAYS` | Días de reservas que procesa el ETL | `90` |
| `ANALYTICS_TZ` | Zona horaria de las franjas | `America/Bogota` |
| `ANALYTICS_OPEN_HOURS` | Horas de operación por día (denominador de la ocupación) | `14` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.

## CI/CD

El workflow [`svc-analytics-service.yml`](../../.github/workflows/svc-analytics-service.yml) invoca el pipeline reutilizable [`microservicio.yml`](../../.github/workflows/microservicio.yml) (`workflow_call`):

1. **test**: lint, pruebas unitarias (Jest) y compilación. Si falla, no se publica ni se despliega nada.
2. **docker** (`needs: test`, solo en `main`): imagen `ghcr.io/yayr10/coworkspace-analytics-service` etiquetada con el SHA del commit y `latest`.
3. **deploy** (`needs: docker`, entorno `production`): Render despliega la imagen exacta de ese commit con el secret `RENDER_DEPLOY_HOOK`.
4. **notify**: evento `repository_dispatch` para que el API Gateway se redespliegue.

Cuando este servicio vive en su propio repositorio, usa `.github/workflows/ci.yml`, que llama al mismo pipeline en `YAYR10/coworkspace-pipelines`.
