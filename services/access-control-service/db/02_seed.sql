-- Datos de ejemplo del Access Control Service.
-- Tarjeta NFC de prueba de Ana (válida 30 días). Para probar la validación en la puerta:
--   token = cw1.95000000-0000-4000-8000-000000000001.DemoQrSecret-AnaDemo-0001
-- En la base solo queda el hash SHA-256 del secreto, nunca el secreto.
SET search_path TO access;

INSERT INTO member_access (member_id, active, plan_code, renews_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000003', true, 'FLEX_DESK', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000004', true, 'PRIVATE_OFFICE', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000005', false, 'MEETING_ROOMS_ONLY', now() - interval '14 days', now())
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO access_credentials (id, member_id, member_email, kind, credential_hash, is_active, issued_at, expires_at, revoked_at, revoked_reason) VALUES
  ('95000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co', 'NFC',
   'c3820b18975cf95b995f5704daf70cc3f1274418af1f388bb03f6c08edad46d7', true, now() - interval '1 day', now() + interval '30 days', NULL, NULL),
  -- Credencial de Mariana revocada automáticamente al recibir membership.expired
  ('95000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'mariana@demo.co', 'NFC',
   '0000000000000000000000000000000000000000000000000000000000000000', false, now() - interval '40 days', now() - interval '10 days', now() - interval '14 days', 'membership.expired')
ON CONFLICT (id) DO NOTHING;

INSERT INTO access_log (id, member_id, location_id, credential_id, timestamp, granted, reason, latency_ms) VALUES
  ('96000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', now() - interval '1 day' + interval '2 hours', true, 'GRANTED', 4),
  ('96000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', now() - interval '12 days', false, 'REVOKED', 3),
  ('96000000-0000-4000-8000-000000000003', NULL, 'c0000000-0000-4000-8000-000000000001', NULL, now() - interval '6 hours', false, 'MALFORMED', 1)
ON CONFLICT (id) DO NOTHING;
