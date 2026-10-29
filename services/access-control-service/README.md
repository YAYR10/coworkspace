# Access Control Service

[![access-control-service](https://github.com/YAYR10/coworkspace/actions/workflows/svc-access-control-service.yml/badge.svg)](https://github.com/YAYR10/coworkspace/actions/workflows/svc-access-control-service.yml)

Credenciales digitales de acceso físico (QR y NFC) y validación en tiempo real en la puerta de cada sede.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-access.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3006 |
| Base de datos | PostgreSQL, schema propio `access` |

## Responsabilidad

- Emite credenciales de corta duración: el QR vive 2 minutos y se renueva solo; solo se guarda el hash SHA-256 del secreto.
- Valida en milisegundos: búsqueda por llave primaria, comparación en tiempo constante y proyección local del estado de la membresía.
- Si no conoce al miembro, consulta a Membership por REST (GET /subscriptions/member/:id/active).
- Revoca todas las credenciales al recibir membership.expired y registra cada intento en la bitácora.

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
| POST | `/api/access/credentials` | Miembro | Generar mi QR (o NFC para otro miembro, solo personal) |
| GET | `/api/access/credentials/me` | Miembro | Mis credenciales |
| DELETE | `/api/access/credentials/:id` | Miembro | Revocar una credencial |
| POST | `/api/access/validate` | Coordinador | Validar un código en la puerta |
| GET | `/api/access/logs/me` | Miembro | Mis ingresos |
| GET | `/api/access/logs` | Coordinador | Bitácora (filtros locationId, memberId) |
| GET | `/api/access/stats` | Coordinador | Ingresos, denegados y latencia de las últimas 24 h |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

**Consume:** `membership.activated`, `membership.expired`

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `access_credentials`, `access_log`, `member_access`.

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
| `PORT` | Puerto HTTP | `3006` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `access` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `access-control-service` |
| `MEMBERSHIP_SERVICE_URL` | Consulta síncrona de la membresía | `http://localhost:3001` |
| `ACCESS_QR_TTL_SECONDS` | Vida del QR en segundos | `120` |
| `ACCESS_NFC_TTL_DAYS` | Vida de una tarjeta NFC en días | `30` |
| `MEMBERSHIP_TIMEOUT_MS` | Tiempo máximo de la consulta a Membership | `45000` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.

## CI/CD

El workflow [`svc-access-control-service.yml`](../../.github/workflows/svc-access-control-service.yml) invoca el pipeline reutilizable [`microservicio.yml`](../../.github/workflows/microservicio.yml) (`workflow_call`):

1. **test**: lint, pruebas unitarias (Jest) y compilación. Si falla, no se publica ni se despliega nada.
2. **docker** (`needs: test`, solo en `main`): imagen `ghcr.io/yayr10/coworkspace-access-control-service` etiquetada con el SHA del commit y `latest`.
3. **deploy** (`needs: docker`, entorno `production`): Render despliega la imagen exacta de ese commit con el secret `RENDER_DEPLOY_HOOK`.
4. **notify**: evento `repository_dispatch` para que el API Gateway se redespliegue.

Cuando este servicio vive en su propio repositorio, usa `.github/workflows/ci.yml`, que llama al mismo pipeline en `YAYR10/coworkspace-pipelines`.
