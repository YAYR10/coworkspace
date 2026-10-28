# Membership Service

Gestiona miembros, autenticación (JWT + refresh tokens) y suscripciones a los planes de membresía, incluida la renovación mensual.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-membership.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3001 |
| Base de datos | PostgreSQL, schema propio `membership` |

## Responsabilidad

- Registro, login, refresh y logout con JWT de corta duración y refresh token rotativo.
- Roles ADMIN, COORDINATOR y MEMBER.
- Planes (puesto flexible, escritorio dedicado, oficina privada, solo salas) y suscripciones.
- Ciclo de renovación diario: renueva o vence suscripciones y publica los eventos.

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
| POST | `/api/auth/register` | Público | Crear cuenta |
| POST | `/api/auth/login` | Público | Iniciar sesión |
| POST | `/api/auth/refresh` | Público | Renovar el token de acceso |
| POST | `/api/auth/logout` | Público | Revocar el refresh token |
| GET | `/api/plans` | Público | Listar planes |
| POST | `/api/plans` | Admin | Crear plan |
| PATCH | `/api/plans/:id` | Admin | Editar plan |
| GET | `/api/members/me` | Miembro | Mi perfil |
| PATCH | `/api/members/me` | Miembro | Editar mi perfil |
| POST | `/api/members/me/password` | Miembro | Cambiar contraseña |
| GET | `/api/members` | Admin | Listar usuarios |
| PATCH | `/api/members/:id/role` | Admin | Cambiar rol |
| GET | `/api/members/:id/contact` | Interno | Nombre y correo (para Notification) |
| POST | `/api/subscriptions` | Miembro | Suscribirse a un plan (solo con pago simulado; con Wompi activo responde 402 y el plan se paga en `/api/payments/plans/checkout`) |
| POST | `/subscriptions/internal/activate` | Interno | Billing activa el plan cuando el pago se aprueba |
| GET | `/api/subscriptions/me` | Miembro | Mis suscripciones |
| GET | `/api/subscriptions/member/:memberId/active` | Interno | ¿Membresía vigente? (Access Control, Community) |
| POST | `/api/subscriptions/:id/cancel` | Miembro | Desactivar renovación automática |
| POST | `/api/subscriptions/:id/expire` | Admin | Vencer ya (demostración) |
| POST | `/api/subscriptions/renewals/run` | Admin | Ejecutar el ciclo de renovación |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

**Publica:** `membership.activated`, `membership.expired`

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `members`, `membership_plans`, `subscriptions`, `refresh_tokens`.

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
| `PORT` | Puerto HTTP | `3001` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `membership` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `membership-service` |
| `JWT_SECRET` | Firma de los JWT (la misma del Gateway) | `cambia-este-secreto` |
| `ACCESS_TOKEN_TTL` | Duración del token de acceso | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Días de vigencia del refresh token | `7` |
| `BILLING_CYCLE_DAYS` | Duración del periodo de la membresía | `30` |
| `BILLING_SERVICE_URL` | Para saber si hay pasarela de pagos activa | `http://localhost:3004` |
| `ADMIN_EMAIL` | Administrador que se crea al iniciar (opcional) | `admin@coworkspace.co` |
| `ADMIN_PASSWORD` | Contraseña de ese administrador | `cambia-esta-clave` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.
