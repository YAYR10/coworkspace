# Space Service

Catálogo de sedes, salas de reunión y puestos de trabajo, con fotos, servicios y coordenadas para el mapa.

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-space.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3002 |
| Base de datos | PostgreSQL, schema propio `space` |

## Responsabilidad

- CRUD de sedes, salas y puestos (coordinador o administrador).
- Búsqueda por país y ciudad; caché en Redis de los listados.
- Fotos de las sedes y sedes de ejemplo para la demostración.
- Consulta interna de recursos que usa Booking para validar cada reserva.

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
| GET | `/api/locations` | Público | Sedes (filtros country, city) |
| GET | `/api/locations/countries` | Público | Países con sedes |
| GET | `/api/locations/:id` | Público | Detalle con salas y puestos |
| GET | `/api/locations/:id/photo` | Público | Foto de la sede |
| POST | `/api/locations` | Coordinador | Crear sede |
| PATCH | `/api/locations/:id` | Coordinador | Editar sede |
| PUT | `/api/locations/:id/photo` | Coordinador | Subir foto |
| DELETE | `/api/locations/:id/photo` | Coordinador | Quitar foto |
| POST | `/api/locations/demo` | Admin | Crear sedes de ejemplo |
| GET | `/api/rooms` | Público | Salas |
| POST | `/api/rooms` | Coordinador | Crear sala |
| PATCH | `/api/rooms/:id` | Coordinador | Editar sala |
| GET | `/api/desks` | Público | Puestos |
| POST | `/api/desks` | Coordinador | Crear puesto |
| PATCH | `/api/desks/:id` | Coordinador | Editar puesto |
| GET | `/api/resources/:type/:id` | Interno | Recurso para Booking/Notification |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

No publica ni consume eventos; se comunica por REST.

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `locations`, `rooms`, `desks`, `location_photos`.

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
| `PORT` | Puerto HTTP | `3002` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `space` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `space-service` |
| `CACHE_TTL_SECONDS` | Segundos de caché de los listados | `60` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.
