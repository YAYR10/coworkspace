# Billing Service

Facturación recurrente de membresías con factura electrónica, cargos adicionales por uso fuera del plan y pasarela de pagos Wompi (sandbox).

Forma parte de **CoworkSpace**, plataforma de microservicios para una red de espacios de coworking.

| | |
|---|---|
| Despliegue | https://coworkspace-billing.onrender.com/health |
| A través del API Gateway | https://coworkspace-gateway.onrender.com/api |
| Puerto local | 3004 |
| Base de datos | PostgreSQL, schema propio `billing` |

## Responsabilidad

- Factura electrónica (FE-…) por cada periodo de membresía, idempotente por periodo.
- Decide el cargo adicional de cada reserva según el plan (paso de la saga).
- Con llaves de Wompi: deja el cargo PENDING, genera el checkout firmado, verifica la transacción y recibe el webhook firmado.
- Sin llaves: pasarela simulada con cupo (EXTRA_CHARGE_APPROVAL_LIMIT).

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
| GET | `/api/invoices/me` | Miembro | Mis facturas |
| GET | `/api/invoices` | Admin | Todas las facturas |
| GET | `/api/charges/me` | Miembro | Mis cargos adicionales |
| GET | `/api/charges` | Admin | Todos los cargos |
| GET | `/api/charges/booking/:bookingId` | Miembro | Cargo de una reserva |
| POST | `/api/charges/booking/:bookingId/checkout` | Miembro | Abrir el checkout de Wompi |
| GET | `/api/payments/status` | Público | Pasarela activa (wompi o simulada) |
| POST | `/api/payments/wompi/verify` | Miembro | Verificar la transacción al volver del checkout |
| POST | `/api/payments/wompi/webhook` | Público (firmado) | Evento transaction.updated de Wompi |
| GET | `/health` | Público | Estado del servicio y de su base de datos |
| GET | `/metrics` | Público | Métricas para Prometheus |

## Eventos

**Publica:** `billing.charge.approved`, `billing.charge.rejected`, `billing.charge.pending`, `billing.invoice.paid`

**Consume:** `membership.activated`, `membership.expired`, `booking.created`, `booking.cancelled`

Los eventos viajan por Redis Pub/Sub y se copian en el stream `coworkspace:events` para que los consumidores que estaban dormidos los procesen al despertar.

## Base de datos

Tablas: `member_plans`, `invoices`, `extra_charges`.

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
| `PORT` | Puerto HTTP | `3004` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://cowork:cowork@localhost:5432/coworkspace` |
| `DB_SCHEMA` | Schema propio del servicio (base de datos por servicio) | `billing` |
| `REDIS_URL` | Redis (eventos de dominio) | `redis://localhost:6379` |
| `INTERNAL_API_KEY` | Clave compartida con el Gateway; sin ella el servicio rechaza llamadas directas | `cambia-esta-clave` |
| `SERVICE_NAME` | Nombre del servicio en eventos y logs | `billing-service` |
| `EXTRA_ROOM_HOURLY_RATE` | Tarifa por hora de sala fuera del plan (COP) | `50000` |
| `EXTRA_DESK_HOURLY_RATE` | Tarifa por hora de puesto fuera del plan (COP) | `15000` |
| `EXTRA_CHARGE_APPROVAL_LIMIT` | Cupo de la pasarela simulada | `200000` |
| `PAYMENT_FORCE_REJECT` | Forzar rechazo en la pasarela simulada (pruebas) | `false` |
| `WOMPI_PUBLIC_KEY` | Llave pública de Wompi (pub_test_… en sandbox) | — |
| `WOMPI_INTEGRITY_SECRET` | Secreto de integridad para firmar el checkout | — |
| `WOMPI_EVENTS_SECRET` | Secreto de eventos para validar el webhook | — |
| `WOMPI_API_URL` | API de Wompi (por defecto sandbox o producción según la llave) | — |
| `PAYMENT_REDIRECT_URL` | Página a la que vuelve el checkout | `http://localhost:5173/pago` |

Las credenciales se configuran como variables de entorno en Render; ningún secreto está en el código.
