-- Datos de ejemplo del Community Service: directorio, eventos de networking y mensajes.
SET search_path TO community;

INSERT INTO member_directory (member_id, display_name, headline, bio, company, skills, location_id, linkedin_url, visible, created_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'Ana Gómez', 'Diseñadora UX', 'Diseño productos digitales para fintech. Siempre dispuesta a un café.', 'Estudio Sinú',
   '{UX,Figma,Research}', 'c0000000-0000-4000-8000-000000000001', NULL, true, now() - interval '80 days', now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000004', 'Carlos Ruiz', 'Desarrollador backend', NULL, 'Freelance',
   '{Node.js,PostgreSQL}', 'c0000000-0000-4000-8000-000000000002', NULL, true, now() - interval '50 days', now() - interval '2 days')
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO events (id, location_id, title, description, scheduled_at, duration_minutes, capacity, created_by, cancelled, created_at) VALUES
  ('97000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Café de emprendedores', 'Presenta tu proyecto en 3 minutos y conoce a otros miembros.',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '3 days 23 hours', 90, 30, 'a0000000-0000-4000-8000-000000000002', false, now() - interval '3 days'),
  ('97000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Taller: facturación electrónica para independientes', NULL,
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '6 days 14 hours', 120, 20, 'a0000000-0000-4000-8000-000000000002', false, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_attendees (event_id, member_id, created_at) VALUES
  ('97000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', now() - interval '2 days'),
  ('97000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', now() - interval '1 day'),
  ('97000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', now() - interval '1 day')
ON CONFLICT (event_id, member_id) DO NOTHING;

INSERT INTO messages (id, sender_id, recipient_id, body, read_at, created_at) VALUES
  ('98000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'Hola Ana, vi que haces UX. ¿Te interesa revisar la app que estoy construyendo?', now() - interval '20 hours', now() - interval '1 day'),
  ('98000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', '¡Claro! Nos vemos en el Café de emprendedores.', NULL, now() - interval '18 hours')
ON CONFLICT (id) DO NOTHING;
