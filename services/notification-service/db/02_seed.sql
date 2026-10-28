-- Datos de ejemplo del Notification Service: correos registrados y recordatorios programados.
SET search_path TO notification;

INSERT INTO notifications (id, event_id, event_type, member_id, email, subject, body, status, error, created_at) VALUES
  ('93000000-0000-4000-8000-000000000001', 'demo-evt-0001', 'membership.activated', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co',
   'Bienvenido a CoworkSpace: plan Puesto flexible', E'Hola Ana,\n\ntu plan Puesto flexible ya está activo. Ya puedes reservar desde la aplicación.', 'LOGGED', NULL, now() - interval '88 days'),
  ('93000000-0000-4000-8000-000000000002', 'demo-evt-0002', 'booking.confirmed', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co',
   'Reserva confirmada: Sala Sinú', E'Hola Ana,\n\ntu reserva de Sala Sinú en Sede Centro está confirmada.\n\nComo tu plan no incluye este espacio, se cobró un adicional de $ 100.000.', 'LOGGED', NULL, now() - interval '1 day'),
  ('93000000-0000-4000-8000-000000000003', 'demo-evt-0003', 'booking.cancelled', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co',
   'Tu reserva de Sala Monserrate fue cancelada', E'Hola Ana,\n\ntu reserva quedó cancelada.\n\nNo pudimos aprobar el cobro adicional, así que la reserva se canceló y el horario quedó libre.', 'LOGGED', NULL, now() - interval '2 days'),
  ('93000000-0000-4000-8000-000000000004', 'demo-evt-0004', 'membership.expired', 'a0000000-0000-4000-8000-000000000005', 'mariana@demo.co',
   'Tu plan venció', E'Hola Mariana,\n\ntu plan llegó a su fin y no se renovó.', 'LOGGED', NULL, now() - interval '14 days')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO reminders (id, kind, ref_id, member_id, send_at, payload, status, created_at) VALUES
  ('94000000-0000-4000-8000-000000000001', 'BOOKING_REMINDER', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' + interval '18 hours',
   jsonb_build_object('bookingId', 'f0000000-0000-4000-8000-000000000002', 'memberId', 'a0000000-0000-4000-8000-000000000003', 'resourceType', 'ROOM',
     'resourceId', 'd0000000-0000-4000-8000-000000000001', 'locationId', 'c0000000-0000-4000-8000-000000000001',
     'startTime', to_char(date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day 19 hours', 'YYYY-MM-DD"T"HH24:MI:SS".000Z"'),
     'endTime', to_char(date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day 21 hours', 'YYYY-MM-DD"T"HH24:MI:SS".000Z"')),
   'PENDING', now() - interval '1 day')
ON CONFLICT (kind, ref_id) DO NOTHING;
