# CoworkSpace – Plataforma de gestión de espacios de coworking

Implementación de 4 microservicios + API Gateway según el documento del proyecto.

| Servicio | Puerto local | Responsabilidad | Schema BD |
|---|---|---|---|
| **api-gateway** | 3000 | Enrutamiento, autenticación JWT, rate limiting | – |
| **membership-service** | 3001 | Miembros, login/refresh tokens, planes, suscripciones y renovación automática | `membership` |
| **space-service** | 3002 | Sedes, salas, puestos, equipamiento (con caché Redis) | `space` |
| **booking-service** | 3003 | Reservas en tiempo real con **bloqueo optimista**, lista de espera, saga | `booking` |
| **billing-service** | 3004 | Cobro recurrente, cargos adicionales, factura electrónica (simulada), saga | `billing` |

**Stack:** NestJS · Prisma · PostgreSQL · Redis (Pub/Sub + caché) · Docker · GitHub Actions · GHCR · Render · k6 · Prometheus/Grafana.

## Arquitectura

```mermaid
flowchart LR
  App[App / Panel admin] -->|HTTPS + JWT| GW[API Gateway]
  GW --> MS[Membership]
  GW --> SS[Space]
  GW --> BS[Booking]
  GW --> BL[Billing]
  BS -- REST síncrono --> SS
  MS -. membership.activated / expired .-> R[(Redis Pub/Sub)]
  BS -. booking.created / cancelled / confirmed .-> R
  BL -. billing.charge.approved / rejected .-> R
  R -.-> BL
  R -.-> BS
```

### Comunicación entre servicios
- **Síncrona (REST):** Booking consulta a Space (`GET /resources/:type/:id`, cacheado en Redis) antes de reservar.
- **Asíncrona (eventos Redis Pub/Sub):**

| Evento | Publica | Consume |
|---|---|---|
| `membership.activated` | Membership | Billing (factura del periodo) |
| `membership.expired` | Membership | Billing |
| `booking.created` | Booking | Billing (paso 2 de la saga) |
| `billing.charge.approved` | Billing | Booking (confirma) |
| `billing.charge.rejected` | Billing | Booking (**compensación**: libera la reserva) |
| `booking.cancelled` | Booking | Billing (anula el cargo) |
| `booking.confirmed`, `booking.waitlist.promoted`, `billing.invoice.*` | Booking / Billing | (Notification Service futuro) |

### Patrón Saga coreografiada – "reserva de sala con cargo adicional"
1. Booking crea la reserva en `PENDING` y publica `booking.created`.
2. Billing revisa el plan del miembro: si el recurso está incluido → `approved` con monto 0; si no, cobra `horas × tarifa`.
3. Si el cobro se aprueba → Booking pasa la reserva a `CONFIRMED`.
4. Si se rechaza → Booking la pasa a `CANCELLED (PAYMENT_REJECTED)` y la lista de espera se promueve automáticamente.
5. Si Billing nunca responde, un cron cancela las reservas `PENDING` tras `SAGA_TIMEOUT_MINUTES` (por defecto 5).

### Bloqueo optimista (sin dobles reservas)
Cada recurso tiene una fila `resource_locks(resource_id, version)`. Al reservar se lee la versión, se verifica que no haya solapamiento y, dentro de una transacción, se ejecuta `UPDATE ... SET version = version + 1 WHERE version = <leída>`. Si otra reserva concurrente ganó, el `UPDATE` afecta 0 filas, se reintenta y el reintento detecta el solapamiento (409). La prueba k6 lanza 50 reservas simultáneas sobre la misma sala y exige que exactamente una gane.

### Seguridad
- JWT de acceso de corta duración (15 min) + refresh tokens rotativos (se guardan hasheados).
- El Gateway borra cualquier header `x-user-*` que venga del cliente, valida el JWT y reenvía la identidad.
- Todos los servicios exigen el header `x-internal-key` (secreto compartido): aunque tengan URL pública en Render, no se pueden llamar saltándose el Gateway.
- Rate limiting: 120 req/min por IP (10/min en login).

## Correr en local

Requisitos: Docker Desktop.

```bash
docker compose up --build
# Con Prometheus (9090) y Grafana (3100, admin/admin):
docker compose --profile observability up --build
```

Gateway en `http://localhost:3000`. Estado de todos los servicios: `GET /health/services`.
Se crea automáticamente el admin `admin@coworkspace.co` / `Admin12345!` y los 4 planes del PDF.

### Pruebas
```bash
cd services/booking-service
npm ci && npx prisma generate
npm run lint && npm test
```

Carga con k6 (con el stack arriba): `k6 run load-tests/booking-peak.js`

## Recorrido de demostración (curl)

```bash
API=http://localhost:3000/api

# 1. Login admin y crear sede + sala
ADMIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@coworkspace.co","password":"Admin12345!"}' | jq -r .accessToken)
LOC=$(curl -s -X POST $API/locations -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"name":"Sede Centro","city":"Montería","address":"Cra 1 # 2-3"}' | jq -r .id)
ROOM=$(curl -s -X POST $API/rooms -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d "{\"locationId\":\"$LOC\",\"name\":\"Sala Sinú\",\"capacity\":8,\"equipment\":{\"projector\":true}}" | jq -r .id)

# 2. Registrar miembro y suscribirlo al plan "Puesto flexible" (NO incluye salas)
TOKEN=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ana","email":"ana@test.co","password":"Password123!"}' | jq -r .accessToken)
PLAN=$(curl -s $API/plans | jq -r '.[] | select(.code=="FLEX_DESK") | .id')
curl -s -X POST $API/subscriptions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"planId\":\"$PLAN\"}"

# 3. Reserva de 2 h fuera del plan -> cargo de 100.000 aprobado -> CONFIRMED
curl -s -X POST $API/bookings -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"resourceType\":\"ROOM\",\"resourceId\":\"$ROOM\",\"startTime\":\"2026-12-01T14:00:00Z\",\"endTime\":\"2026-12-01T16:00:00Z\"}"

# 4. Reserva de 5 h -> 250.000 supera el cupo simulado -> compensación: CANCELLED (PAYMENT_REJECTED)
curl -s -X POST $API/bookings -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"resourceType\":\"ROOM\",\"resourceId\":\"$ROOM\",\"startTime\":\"2026-12-02T13:00:00Z\",\"endTime\":\"2026-12-02T18:00:00Z\"}"

sleep 1
curl -s $API/bookings/me -H "Authorization: Bearer $TOKEN" | jq '.[] | {status, cancelReason}'
curl -s $API/charges/me -H "Authorization: Bearer $TOKEN"
curl -s $API/invoices/me -H "Authorization: Bearer $TOKEN"
```

## Endpoints (a través del Gateway, prefijo `/api`)

| Método | Ruta | Auth |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | pública |
| GET | `/members/me` | miembro |
| GET / POST | `/plans` | pública / admin |
| POST | `/subscriptions` · GET `/subscriptions/me` | miembro |
| POST | `/subscriptions/:id/cancel` (desactiva renovación) | miembro |
| POST | `/subscriptions/:id/expire`, `/subscriptions/renewals/run` | admin |
| GET / POST | `/locations`, `/locations/:id` | pública / admin |
| GET / POST / PATCH | `/rooms?locationId=&minCapacity=&equipment=projector`, `/rooms/:id` | pública / admin |
| GET / POST / PATCH | `/desks?locationId=`, `/desks/:id` | pública / admin |
| POST | `/bookings` · GET `/bookings/me` · GET `/bookings/:id` | miembro |
| GET | `/bookings/availability?resourceId=&from=&to=` | miembro |
| PATCH | `/bookings/:id/cancel` | miembro |
| POST / GET | `/bookings/waitlist`, `/bookings/waitlist/me` | miembro |
| GET | `/invoices/me`, `/charges/me` · GET `/invoices` | miembro · admin |

Cada servicio expone además `GET /health` y `GET /metrics` (Prometheus).

## Despliegue (GitHub Actions → GHCR → Render)

1. **Sube el repo a GitHub** (rama `main`). El workflow `.github/workflows/ci-cd.yml` corre lint, tests, la prueba k6 y publica las 5 imágenes en `ghcr.io/<tu-usuario>/coworkspace-<servicio>`.
2. **Haz públicas las imágenes:** en GitHub → tu perfil → *Packages* → cada paquete → *Package settings* → *Change visibility* → Public. (O configura una credencial de registro en Render.)
3. **Crea la infraestructura en Render:** edita `render.yaml` y cambia `TU_USUARIO_GITHUB` por tu usuario en minúsculas. En Render: *New → Blueprint* → selecciona el repo. Esto crea la BD PostgreSQL, Redis (Key Value), los 5 servicios y los secretos compartidos.
4. **Completa las variables marcadas `sync: false`** que Render te pedirá:
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (membership).
   - `SPACE_SERVICE_URL` en booking y las 4 `*_SERVICE_URL` en el gateway, con las URLs `https://coworkspace-xxx.onrender.com` de cada servicio.
5. **Deploy automático:** en cada servicio de Render → *Settings* → *Deploy Hook*, copia la URL y guárdala en GitHub → *Settings → Secrets and variables → Actions* como `RENDER_DEPLOY_HOOK_MEMBERSHIP`, `RENDER_DEPLOY_HOOK_SPACE`, `RENDER_DEPLOY_HOOK_BOOKING`, `RENDER_DEPLOY_HOOK_BILLING`, `RENDER_DEPLOY_HOOK_GATEWAY`. Desde ese momento cada push a `main` despliega la imagen del commit.
6. Verifica: `https://coworkspace-gateway.onrender.com/health/services`.

### Notas sobre el plan gratuito de Render
- Los servicios free se **duermen** tras un rato sin tráfico y tardan cerca de un minuto en despertar. Antes de la demo abre `/health/services` para despertarlos todos.
- Mientras un servicio duerme no recibe eventos de Redis Pub/Sub (no hay persistencia de mensajes). Por eso existe el timeout de la saga, y en producción se usaría Redis Streams, RabbitMQ o Kafka.
- Las redes privadas completas (servicios `pserv`) requieren plan pago; por eso los servicios se comunican por URL pública protegida con `INTERNAL_API_KEY`.
- La BD usa un schema por servicio dentro de una sola instancia PostgreSQL (el plan free permite una sola BD). Cada servicio solo accede a su schema.

## Variables de entorno principales

| Variable | Servicio | Por defecto |
|---|---|---|
| `JWT_SECRET`, `INTERNAL_API_KEY` | todos | — |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | membership | `15m`, `7` |
| `BILLING_CYCLE_DAYS` | membership | `30` |
| `CACHE_TTL_SECONDS` | space | `60` |
| `OPTIMISTIC_LOCK_MAX_RETRIES`, `MAX_BOOKING_HOURS`, `SAGA_TIMEOUT_MINUTES` | booking | `5`, `12`, `5` |
| `EXTRA_ROOM_HOURLY_RATE`, `EXTRA_DESK_HOURLY_RATE` | billing | `50000`, `15000` |
| `EXTRA_CHARGE_APPROVAL_LIMIT`, `PAYMENT_FORCE_REJECT` | billing | `200000`, `false` |
| `RATE_LIMIT_PER_MINUTE`, `LOGIN_RATE_LIMIT_PER_MINUTE`, `CORS_ORIGIN` | gateway | `120`, `10`, `*` |

Desplegado en Render: https://coworkspace-gateway.onrender.com
