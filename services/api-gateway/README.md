# API Gateway

Punto de entrada único de **CoworkSpace**. Valida el JWT, aplica rate limiting y enruta cada petición `/api/*` al microservicio dueño del recurso.

| | |
|---|---|
| Despliegue | https://coworkspace-gateway.onrender.com/health/services |
| Puerto local | 3000 |
| Base de datos | No tiene (no guarda estado) |

## Responsabilidad

- Autenticación centralizada: valida el JWT y reenvía la identidad a los servicios en `x-user-id`, `x-user-role` y `x-user-email`. Borra esos headers si vienen del cliente (anti-suplantación).
- Agrega la `INTERNAL_API_KEY` a cada llamada: los microservicios rechazan lo que no pase por aquí.
- Rate limiting general (120/min por IP) y más estricto en el login (10/min).
- Bloquea los endpoints internos entre servicios (`/subscriptions/member/...`, `/members/:id/contact`).
- `x-request-id` en cada petición para rastrear una operación entre servicios.
- `/health/services`: estado y latencia de los 8 microservicios.

## Tecnologías

NestJS 10 · http-proxy-middleware · jsonwebtoken · express-rate-limit · Jest · Docker · Prometheus (`/metrics`)

## Instalación y ejecución

```bash
cp .env.example .env
npm ci
npm run start:dev
npm test && npm run lint && npm run build
```

## Enrutamiento

| Prefijo | Microservicio |
|---|---|
| `/api/auth`, `/api/members`, `/api/plans`, `/api/subscriptions` | Membership (3001) |
| `/api/locations`, `/api/rooms`, `/api/desks` | Space (3002) |
| `/api/bookings` | Booking (3003) |
| `/api/invoices`, `/api/charges`, `/api/payments` | Billing (3004) |
| `/api/notifications` | Notification (3005) |
| `/api/access` | Access Control (3006) |
| `/api/community` | Community (3007) |
| `/api/analytics` | Analytics (3008) |

Rutas públicas (sin token): registro/login/refresh/logout, planes, sedes/salas/puestos (GET), disponibilidad de un espacio, eventos de la comunidad, estado de la pasarela y webhook de Wompi (validado con firma). Todo lo demás exige `Authorization: Bearer <token>`.

El detalle de cada endpoint está en el README de cada microservicio.

## Variables de entorno

Ver `.env.example`: `PORT`, `JWT_SECRET`, `INTERNAL_API_KEY`, `RATE_LIMIT_PER_MINUTE`, `LOGIN_RATE_LIMIT_PER_MINUTE`, `PROXY_TIMEOUT_MS`, `CORS_ORIGIN` y la URL de cada microservicio (`*_SERVICE_URL`).
