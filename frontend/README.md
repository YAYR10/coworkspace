# CoworkSpace Web

Interfaz de CoworkSpace (React + Vite + TypeScript). Habla solo con el **API Gateway**; nunca llama directo a los microservicios.

| Sección | Qué hace | Servicio detrás |
|---|---|---|
| Arranque | Espera a que los 4 servicios respondan (`/health/services`) | Gateway |
| Acceso | Registro e inicio de sesión con JWT (renueva el token vencido solo) | Membership |
| Reservar | Disponibilidad por horas, reserva y seguimiento de la saga en vivo | Space, Booking, Billing |
| Mis reservas | Reservas próximas y pasadas, cancelación, lista de espera | Booking |
| Membresía | Plan actual, suscripción y renovación | Membership |
| Pagos | Facturas del plan y cobros por horas | Billing |
| Administrar (rol ADMIN) | Sedes, salas y puestos; facturación total | Space, Billing |

## Desarrollo local

```bash
cd frontend
cp .env.example .env        # ajusta VITE_API_URL (http://localhost:3000 con docker compose)
npm install
npm run dev                 # http://localhost:5173
```

## Despliegue

Render lo publica como **sitio estático** (bloque `coworkspace-web` en `render.yaml`):
`npm ci && npm run build` dentro de `frontend/`, y sirve la carpeta `dist`.
`VITE_API_URL` se inyecta en tiempo de compilación. Cada push a `main` que toque `frontend/` lo vuelve a desplegar.
