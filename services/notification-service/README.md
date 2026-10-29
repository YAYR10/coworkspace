# Notification Service

[![notification-service](https://github.com/YAYR10/coworkspace/actions/workflows/svc-notification-service.yml/badge.svg)](https://github.com/YAYR10/coworkspace/actions/workflows/svc-notification-service.yml)

Envía los correos de la plataforma: confirmaciones y cancelaciones de reservas, recordatorios antes de cada reserva y avisos de vencimiento de la membresía.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-notification.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3005 |
| Base de datos | PostgreSQL, schema propio `notification` |

## Responsabilidad

- Consume los eventos desde un Redis Stream con grupo de consumidores (no pierde eventos si estaba dormido).
- Correo por evento, idempotente por id de evento; envío por la API HTTP de Brevo o modo demostración.
- Programa recordatorios (60 min antes de la reserva y 3 días antes del vencimiento) y los envía con un cron por minuto.

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
| GET | `/api/notifications/me` | Miembro | Mis avisos |
| GET | `/api/notifications/reminders/me` | Miembro | Mis recordatorios programados |
| GET | `/api/notifications` | Admin | Todos los correos |
| GET | `/api/notifications/status` | Admin | Modo de envío |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

**Consume:** `booking.confirmed`, `booking.cancelled`, `booking.waitlist.promoted`, `membership.activated`, `membership.expired`

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `notifications`, `reminders`.

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
| `PORT` | Puerto HTTP | `3005` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `notification` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `notification-service` |
| `MEMBERSHIP_SERVICE_URL` | Para obtener nombre y correo del miembro | `http://localhost:3001` |
| `SPACE_SERVICE_URL` | Para el nombre del espacio y la sede | `http://localhost:3002` |
| `BREVO_API_KEY` | Clave de Brevo; vacío = modo demostración | — |
| `MAIL_FROM` | Remitente verificado en Brevo | — |
| `MAIL_FROM_NAME` | Nombre del remitente | `CoworkSpace` |
| `APP_URL` | Enlace del botón de los correos | `http://localhost:5173` |
| `APP_TIMEZONE` | Zona horaria de los correos | `America/Bogota` |
| `REMINDER_MINUTES_BEFORE` | Minutos antes de la reserva para el recordatorio | `60` |
| `MEMBERSHIP_WARNING_DAYS` | Días antes del vencimiento para el aviso | `3` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.

## CI/CD

El workflow [`svc-notification-service.yml`](../../.github/workflows/svc-notification-service.yml) invoca el pipeline reutilizable [`microservicio.yml`](../../.github/workflows/microservicio.yml) (`workflow_call`):

1. **test**: lint, pruebas unitarias (Jest) y compilación. Si falla, no se publica ni se despliega nada.
2. **docker** (`needs: test`, solo en `main`): imagen `ghcr.io/yayr10/coworkspace-notification-service` etiquetada con el SHA del commit y `latest`.
3. **deploy** (`needs: docker`, entorno `production`): Render despliega la imagen exacta de ese commit con el secret `RENDER_DEPLOY_HOOK`.
4. **notify**: evento `repository_dispatch` para que el API Gateway se redespliegue.

Cuando este servicio vive en su propio repositorio, usa `.github/workflows/ci.yml`, que llama al mismo pipeline en `YAYR10/coworkspace-pipelines`.
