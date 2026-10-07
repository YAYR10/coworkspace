/**
 * Sedes de ejemplo para demostrar la búsqueda por país, el mapa y las fotos.
 * Fotos: Unsplash (licencia libre, https://unsplash.com/license).
 */
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=70&auto=format&fit=crop`;

export interface DemoLocation {
  name: string;
  country: string;
  city: string;
  address: string;
  description: string;
  services: string[];
  latitude: number;
  longitude: number;
  photoUrl: string;
  rooms: { name: string; capacity: number; equipment: Record<string, boolean> }[];
  desks: { code: string; isDedicated: boolean }[];
}

const BASIC = ['WiFi de alta velocidad', 'Café y agua', 'Recepción'];

export const DEMO_LOCATIONS: DemoLocation[] = [
  {
    name: 'Sede Ronda del Sinú',
    country: 'Colombia',
    city: 'Montería',
    address: 'Cra 2 # 30-15',
    description: 'Frente a la Ronda del Sinú, con terraza y vista al río.',
    services: [...BASIC, 'Parqueadero', 'Zona de descanso', 'Aire acondicionado'],
    latitude: 8.7575,
    longitude: -75.889,
    photoUrl: photo('1606836576983-8b458e75221d'),
    rooms: [
      { name: 'Sala Sinú', capacity: 8, equipment: { projector: true, whiteboard: true } },
      { name: 'Sala Guayacán', capacity: 4, equipment: { tv: true } },
    ],
    desks: [{ code: 'M-01', isDedicated: false }, { code: 'M-02', isDedicated: false }, { code: 'M-10', isDedicated: true }],
  },
  {
    name: 'Sede Parque 93',
    country: 'Colombia',
    city: 'Bogotá',
    address: 'Cl 93B # 13-30',
    description: 'A una cuadra del Parque de la 93, ideal para reuniones con clientes.',
    services: [...BASIC, 'Cabinas telefónicas', 'Impresión', 'Acceso 24/7', 'Lockers'],
    latitude: 4.6767,
    longitude: -74.0483,
    photoUrl: photo('1527192491265-7e15c55b1ed2'),
    rooms: [
      { name: 'Sala Monserrate', capacity: 12, equipment: { projector: true, videoconference: true } },
      { name: 'Sala Usaquén', capacity: 6, equipment: { tv: true, whiteboard: true } },
    ],
    desks: [{ code: 'B-01', isDedicated: false }, { code: 'B-02', isDedicated: false }, { code: 'B-20', isDedicated: true }],
  },
  {
    name: 'Sede El Poblado',
    country: 'Colombia',
    city: 'Medellín',
    address: 'Cra 37 # 8A-32',
    description: 'Casa restaurada con patio interior y mucha luz natural.',
    services: [...BASIC, 'Cocina', 'Admite mascotas', 'Zona de descanso'],
    latitude: 6.2088,
    longitude: -75.5672,
    photoUrl: photo('1604328727766-a151d1045ab4'),
    rooms: [
      { name: 'Sala Guatapé', capacity: 10, equipment: { projector: true } },
      { name: 'Sala Arví', capacity: 4, equipment: { whiteboard: true } },
    ],
    desks: [{ code: 'P-01', isDedicated: false }, { code: 'P-02', isDedicated: false }],
  },
  {
    name: 'Sede Getsemaní',
    country: 'Colombia',
    city: 'Cartagena',
    address: 'Cl 30 # 10-25, Getsemaní',
    description: 'En el barrio más vivo de Cartagena, a pasos de la ciudad amurallada.',
    services: [...BASIC, 'Aire acondicionado', 'Lockers'],
    latitude: 10.4214,
    longitude: -75.5452,
    photoUrl: photo('1600508774634-4e11d34730e2'),
    rooms: [{ name: 'Sala Bocagrande', capacity: 6, equipment: { tv: true } }],
    desks: [{ code: 'C-01', isDedicated: false }, { code: 'C-02', isDedicated: false }],
  },
  {
    name: 'Sede Roma Norte',
    country: 'México',
    city: 'Ciudad de México',
    address: 'Colima 160, Roma Norte',
    description: 'Edificio de los años 40 en el corazón de la Roma.',
    services: [...BASIC, 'Cabinas telefónicas', 'Cocina', 'Acceso 24/7'],
    latitude: 19.4183,
    longitude: -99.1626,
    photoUrl: photo('1553028826-f4804a6dba3b'),
    rooms: [
      { name: 'Sala Condesa', capacity: 8, equipment: { projector: true, videoconference: true } },
      { name: 'Sala Coyoacán', capacity: 4, equipment: { whiteboard: true } },
    ],
    desks: [{ code: 'R-01', isDedicated: false }, { code: 'R-02', isDedicated: false }],
  },
  {
    name: 'Sede Miraflores',
    country: 'Perú',
    city: 'Lima',
    address: 'Av. José Larco 812',
    description: 'A diez minutos caminando del malecón.',
    services: [...BASIC, 'Impresión', 'Parqueadero'],
    latitude: -12.1211,
    longitude: -77.0297,
    photoUrl: photo('1600880292203-757bb62b4baf'),
    rooms: [{ name: 'Sala Barranco', capacity: 6, equipment: { tv: true, whiteboard: true } }],
    desks: [{ code: 'L-01', isDedicated: false }, { code: 'L-02', isDedicated: false }],
  },
  {
    name: 'Sede Malasaña',
    country: 'España',
    city: 'Madrid',
    address: 'Calle del Pez 21',
    description: 'Antiguo taller reconvertido, en pleno Malasaña.',
    services: [...BASIC, 'Acceso 24/7', 'Admite mascotas', 'Cocina'],
    latitude: 40.4243,
    longitude: -3.7059,
    photoUrl: photo('1522202176988-66273c2fd55f'),
    rooms: [
      { name: 'Sala Retiro', capacity: 10, equipment: { projector: true, videoconference: true } },
      { name: 'Sala Lavapiés', capacity: 4, equipment: { tv: true } },
    ],
    desks: [{ code: 'MD-01', isDedicated: false }, { code: 'MD-02', isDedicated: false }],
  },
];
