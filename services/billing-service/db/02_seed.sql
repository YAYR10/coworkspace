-- Datos de ejemplo del Billing Service: plan vigente por miembro, facturas electrónicas y cargos adicionales.
SET search_path TO billing;

INSERT INTO member_plans (member_id, subscription_id, plan_code, plan_name, price, resource_access, status, renews_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'ACTIVE', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'ACTIVE', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'EXPIRED', now() - interval '14 days', now())
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO invoices (id, member_id, subscription_id, period, amount, status, electronic_number, failure_reason, created_at) VALUES
  ('91000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '88 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000001', NULL, now() - interval '88 days'),
  ('91000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '58 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000002', NULL, now() - interval '58 days'),
  ('91000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '28 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000003', NULL, now() - interval '28 days'),
  ('91000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', to_char(now() - interval '58 days', 'YYYY-MM-DD'), 1500000, 'PAID', 'FE-DEMO-000004', NULL, now() - interval '58 days'),
  ('91000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', to_char(now() - interval '28 days', 'YYYY-MM-DD'), 1500000, 'PAID', 'FE-DEMO-000005', NULL, now() - interval '28 days'),
  ('91000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', to_char(now() - interval '74 days', 'YYYY-MM-DD'), 250000, 'PAID', 'FE-DEMO-000006', NULL, now() - interval '74 days'),
  ('91000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', to_char(now() - interval '44 days', 'YYYY-MM-DD'), 250000, 'FAILED', NULL, 'Tarjeta rechazada', now() - interval '44 days')
ON CONFLICT (id) DO NOTHING;

-- Cargos adicionales de reservas fuera del plan (saga Booking/Billing)
INSERT INTO extra_charges (id, member_id, booking_id, amount, reason, status, failure_reason, payment_reference, transaction_id, payment_method, created_at, updated_at) VALUES
  ('92000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 100000, 'Uso de ROOM fuera del plan FLEX_DESK (2 h)', 'APPROVED', NULL,
   '92000000-0000-4000-8000-000000000001.demo', '12345-1700000000-00001', 'CARD', now() - interval '1 day', now() - interval '1 day'),
  ('92000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000005', 250000, 'Uso de ROOM fuera del plan FLEX_DESK (5 h)', 'REJECTED', 'Supera el cupo aprobado', NULL, NULL, NULL, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (booking_id) DO NOTHING;
