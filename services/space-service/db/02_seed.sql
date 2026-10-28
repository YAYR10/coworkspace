-- Datos de ejemplo del Space Service: 2 sedes, 2 salas y 2 puestos.
SET search_path TO space;

INSERT INTO locations (id, name, country, city, address, description, services, is_published, latitude, longitude, created_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Colombia', 'Montería', 'Cra 3 # 27-10', 'A dos cuadras de la Ronda del Sinú, con terraza.',
   '{"WiFi de alta velocidad","Café y agua",Recepción,Parqueadero,Lockers}', true, 8.7575, -75.889, now() - interval '120 days'),
  ('c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Colombia', 'Bogotá', 'Cl 93 # 11-26', 'Frente al Parque de la 93.',
   '{"WiFi de alta velocidad","Acceso 24/7","Cabinas telefónicas"}', true, 4.6767, -74.0483, now() - interval '100 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, location_id, name, capacity, equipment, is_active) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sala Sinú', 8, '{"projector": true, "whiteboard": true}', true),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Sala Monserrate', 12, '{"projector": true, "videoconference": true}', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO desks (id, location_id, code, is_dedicated, is_active) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'A-01', false, true),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'B-01', true, true)
ON CONFLICT (id) DO NOTHING;
