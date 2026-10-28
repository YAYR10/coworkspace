-- Datos de ejemplo del Booking Service. Las fechas son relativas a hoy (UTC; Colombia = UTC-5).
SET search_path TO booking;

INSERT INTO bookings (id, member_id, resource_id, resource_type, location_id, start_time, end_time, status, cancel_reason, created_at, updated_at) VALUES
  -- Ana: puesto ayer (incluido en su plan) y sala mañana (cobro adicional aprobado)
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'DESK', 'c0000000-0000-4000-8000-000000000001',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '21 hours', 'CONFIRMED', NULL, now() - interval '3 days', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'ROOM', 'c0000000-0000-4000-8000-000000000001',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' + interval '19 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' + interval '21 hours', 'CONFIRMED', NULL, now() - interval '1 day', now() - interval '1 day'),
  -- Carlos: sala en Bogotá (su plan la incluye)
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '14 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '17 hours', 'CONFIRMED', NULL, now() - interval '4 days', now() - interval '4 days'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'DESK', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '2 days' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '2 days' + interval '22 hours', 'CONFIRMED', NULL, now() - interval '1 day', now() - interval '1 day'),
  -- Compensación de la saga: cobro rechazado -> reserva cancelada
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '3 days' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '3 days' + interval '18 hours', 'CANCELLED', 'PAYMENT_REJECTED', now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Versiones del bloqueo optimista por recurso
INSERT INTO resource_locks (resource_id, version) VALUES
  ('e0000000-0000-4000-8000-000000000001', 1),
  ('d0000000-0000-4000-8000-000000000001', 1),
  ('d0000000-0000-4000-8000-000000000002', 2),
  ('e0000000-0000-4000-8000-000000000002', 1)
ON CONFLICT (resource_id) DO NOTHING;

-- Mariana en lista de espera de la sala de Bogotá
INSERT INTO waitlist_entries (id, member_id, resource_id, resource_type, start_time, end_time, status, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'ROOM',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '14 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '16 hours', 'EXPIRED', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;
