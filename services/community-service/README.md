# Community Service

[![community-service](https://github.com/YAYR10/coworkspace/actions/workflows/svc-community-service.yml/badge.svg)](https://github.com/YAYR10/coworkspace/actions/workflows/svc-community-service.yml)

Red de la comunidad: directorio navegable de miembros, mensajería interna y eventos de networking por sede.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-community.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3007 |
| Base de datos | PostgreSQL, schema propio `community` |

## Responsabilidad

- Antes de cada operación consulta a Membership por REST si el miembro tiene membresía vigente (respuesta en caché 60 s).
- Directorio con búsqueda por texto, sede y habilidad; cada miembro decide si aparece.
- Eventos por sede con cupos e inscripción (transacción que respeta la capacidad).
- Mensajes 1 a 1 con bandeja y contador de no leídos.

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
| GET | `/api/community/members` | Miembro | Directorio (q, locationId, skill) |
| GET | `/api/community/members/:memberId` | Miembro | Perfil de un miembro |
| GET | `/api/community/profile/me` | Miembro | Mi perfil público |
| PUT | `/api/community/profile/me` | Miembro | Guardar mi perfil público |
| GET | `/api/community/events` | Público | Próximos eventos (locationId) |
| POST | `/api/community/events` | Coordinador | Publicar evento |
| DELETE | `/api/community/events/:id` | Coordinador | Cancelar evento |
| POST | `/api/community/events/:id/attend` | Miembro | Inscribirme |
| DELETE | `/api/community/events/:id/attend` | Miembro | Cancelar inscripción |
| GET | `/api/community/events/:id/attendees` | Coordinador | Inscritos |
| POST | `/api/community/messages` | Miembro | Enviar mensaje |
| GET | `/api/community/messages` | Miembro | Bandeja de conversaciones |
| GET | `/api/community/messages/unread` | Miembro | No leídos |
| GET | `/api/community/messages/:memberId` | Miembro | Conversación con un miembro |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

No publica ni consume eventos; se comunica por REST.

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `member_directory`, `events`, `event_attendees`, `messages`.

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
| `PORT` | Puerto HTTP | `3007` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `community` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `community-service` |
| `MEMBERSHIP_SERVICE_URL` | Consulta síncrona de la membresía | `http://localhost:3001` |
| `MEMBERSHIP_CACHE_SECONDS` | Caché de la respuesta de Membership | `60` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.

## CI/CD

El workflow [`svc-community-service.yml`](../../.github/workflows/svc-community-service.yml) invoca el pipeline reutilizable [`microservicio.yml`](../../.github/workflows/microservicio.yml) (`workflow_call`):

1. **test**: lint, pruebas unitarias (Jest) y compilación. Si falla, no se publica ni se despliega nada.
2. **docker** (`needs: test`, solo en `main`): imagen `ghcr.io/yayr10/coworkspace-community-service` etiquetada con el SHA del commit y `latest`.
3. **deploy** (`needs: docker`, entorno `production`): Render despliega la imagen exacta de ese commit con el secret `RENDER_DEPLOY_HOOK`.
4. **notify**: evento `repository_dispatch` para que el API Gateway se redespliegue.

Cuando este servicio vive en su propio repositorio, usa `.github/workflows/ci.yml`, que llama al mismo pipeline en `YAYR10/coworkspace-pipelines`.
