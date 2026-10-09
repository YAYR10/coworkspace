# CoworkSpace Web

Interfaz de CoworkSpace (React + Vite + TypeScript). Habla solo con el **API Gateway**; nunca llama directo a los microservicios.

| Pantalla | Qué hace | Servicio detrás |
|---|---|---|
| Portada (pública) | Buscador por país, ciudad, tipo de espacio y personas; filtros por servicios; lista o mapa de Google; planes | Gateway, Space, Membership |
| Sede (pública) | Foto, servicios, salas y puestos con precio, horarios libres, mapa y "Cómo llegar" | Space, Booking |
| Reserva | El acceso (iniciar sesión o crear cuenta) se pide **solo al reservar**, en una ventana; después la reserva continúa sola y se ve la saga en vivo | Membership, Booking, Billing |
| Mi cuenta | Reservas, membresía, pagos, notificaciones y perfil | Booking, Membership, Billing, Notification |
| Panel (coordinador / admin) | Sedes y servicios, ocupación; el admin además usuarios y roles, planes, facturación y correos | Todos |

Los mapas son de Google Maps (iframe, sin clave de API). Si la sede tiene coordenadas se usan; si no, Google ubica la dirección escrita.
Mientras los servicios del plan gratuito despiertan, las consultas se reintentan solas y se muestra un aviso discreto.

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
