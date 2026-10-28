-- Datos de ejemplo del Membership Service (idempotente: se puede ejecutar varias veces).
-- Contraseña de todos los usuarios de ejemplo: Demo12345!
SET search_path TO membership;

INSERT INTO membership_plans (id, code, name, price, resource_access, description) VALUES
  ('90000000-0000-4000-8000-000000000001', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'Cualquier puesto libre de la red'),
  ('90000000-0000-4000-8000-000000000002', 'DEDICATED_DESK', 'Escritorio dedicado', 600000, '{DESK}', 'Escritorio fijo en una sede'),
  ('90000000-0000-4000-8000-000000000003', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'Oficina privada con salas incluidas'),
  ('90000000-0000-4000-8000-000000000004', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'Acceso únicamente a salas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO members (id, name, email, password_hash, role, phone, country, city, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Admin Demo', 'admin.demo@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'ADMIN', NULL, 'Colombia', 'Montería', now() - interval '120 days'),
  ('a0000000-0000-4000-8000-000000000002', 'Luis Peña', 'coordinador@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'COORDINATOR', '+57 301 000 0002', 'Colombia', 'Bogotá', now() - interval '110 days'),
  ('a0000000-0000-4000-8000-000000000003', 'Ana Gómez', 'ana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', '+57 300 123 4567', 'Colombia', 'Montería', now() - interval '90 days'),
  ('a0000000-0000-4000-8000-000000000004', 'Carlos Ruiz', 'carlos@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', now() - interval '60 days'),
  ('a0000000-0000-4000-8000-000000000005', 'Mariana López', 'mariana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', now() - interval '75 days')
ON CONFLICT (email) DO NOTHING;

-- Ana y Carlos con plan vigente; Mariana con plan vencido (sirve para probar la revocación de acceso)
INSERT INTO subscriptions (id, member_id, plan_id, status, auto_renew, started_at, renews_at) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', (SELECT id FROM membership_plans WHERE code = 'FLEX_DESK'), 'ACTIVE', true, now() - interval '88 days', now() + interval '2 days'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', (SELECT id FROM membership_plans WHERE code = 'PRIVATE_OFFICE'), 'ACTIVE', true, now() - interval '58 days', now() + interval '2 days'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', (SELECT id FROM membership_plans WHERE code = 'MEETING_ROOMS_ONLY'), 'EXPIRED', false, now() - interval '74 days', now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;
