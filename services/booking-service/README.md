# Booking Service

[![booking-service](https://github.com/YAYR10/coworkspace/actions/workflows/svc-booking-service.yml/badge.svg)](https://github.com/YAYR10/coworkspace/actions/workflows/svc-booking-service.yml)

Reservas de salas y puestos por horas con bloqueo optimista (sin dobles reservas), lista de espera y saga coreografiada con Billing.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-booking.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3003 |
| Base de datos | PostgreSQL, schema propio `booking` |

## Responsabilidad

- Crea la reserva en estado PENDING y publica booking.created.
- Bloqueo optimista por recurso (resource_locks.version) con reintentos.
- Confirma o cancela (compensación) según billing.charge.approved / rejected; cancela las que vencen el tiempo de la saga.
- Lista de espera: al liberarse un horario crea la reserva del primero en la fila.

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

Con Docker: `docker compose up --build` levanta este servicio con su propia base de datos (cargada con `db/01_schema.sql` y `db/02_seed.sql`) y Redis. Los servicios de los que depende se configuran con sus variables `*_SERVICE_URL`; el sistema completo se levanta con el `docker-compose.yml` del repositorio principal.

```bash
npm test         # pruebas unitarias (Jest)
npm run lint     # ESLint
npm run build    # compila a dist/
```

## Endpoints

Todas las rutas se consumen a través del API Gateway (prefijo `/api`), que valida el JWT y reenvía la identidad en los headers `x-user-*`. El servicio rechaza llamadas que no traigan la `INTERNAL_API_KEY`. Las rutas **Interno** solo las usan otros microservicios y el Gateway no las expone.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/bookings` | Miembro | Reservar (inicia la saga) |
| GET | `/api/bookings/me` | Miembro | Mis reservas |
| GET | `/api/bookings/:id` | Miembro | Estado de una reserva |
| PATCH | `/api/bookings/:id/cancel` | Miembro | Cancelar |
| GET | `/api/bookings` | Coordinador | Todas las reservas |
| GET | `/api/bookings/availability` | Público | Horarios ocupados de un espacio |
| POST | `/api/bookings/waitlist` | Miembro | Entrar a la lista de espera |
| GET | `/api/bookings/waitlist/me` | Miembro | Mis listas de espera |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

**Publica:** `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.waitlist.promoted`

**Consume:** `billing.charge.approved`, `billing.charge.rejected`

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `bookings`, `resource_locks`, `waitlist_entries`.

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
| `PORT` | Puerto HTTP | `3003` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `booking` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `booking-service` |
| `SPACE_SERVICE_URL` | URL del Space Service | `http://localhost:3002` |
| `SPACE_TIMEOUT_MS` | Tiempo máximo de cada consulta a Space | `60000` |
| `SAGA_TIMEOUT_MINUTES` | Minutos para completar el cobro antes de liberar el horario | `20` |
| `MAX_BOOKING_HOURS` | Duración máxima de una reserva | `12` |
| `OPTIMISTIC_LOCK_MAX_RETRIES` | Reintentos del bloqueo optimista | `5` |
| `SPACE_RETRY_BUDGET_MS` | Tiempo total de reintentos mientras Space despierta (opcional) | `45000` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.

## CI/CD

El workflow [`svc-booking-service.yml`](../../.github/workflows/svc-booking-service.yml) invoca el pipeline reutilizable [`microservicio.yml`](../../.github/workflows/microservicio.yml) (`workflow_call`):

1. **test**: lint, pruebas unitarias (Jest) y compilación. Si falla, no se publica ni se despliega nada.
2. **docker** (`needs: test`, solo en `main`): imagen `ghcr.io/yayr10/coworkspace-booking-service` etiquetada con el SHA del commit y `latest`.
3. **deploy** (`needs: docker`, entorno `production`): Render despliega la imagen exacta de ese commit con el secret `RENDER_DEPLOY_HOOK`.
4. **notify**: evento `repository_dispatch` para que el API Gateway se redespliegue.

Cuando este servicio vive en su propio repositorio, usa `.github/workflows/ci.yml`, que llama al mismo pipeline en `YAYR10/coworkspace-pipelines`.
