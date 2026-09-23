// Prueba de carga del Booking Service con k6: simula la hora pico de reservas
// al inicio de la jornada laboral y verifica que el bloqueo optimista
// nunca permita dobles reservas.
//
//   k6 run -e BASE_URL=http://localhost:3000 load-tests/booking-peak.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@coworkspace.co';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin12345!';
const ROOMS = 10;

const doubleBookings = new Counter('double_bookings');
const bookingsCreated = new Counter('bookings_created');
const bookingConflicts = new Counter('booking_conflicts');

// 409 es una respuesta esperada (recurso ocupado), no un error
http.setResponseCallback(http.expectedStatuses(200, 201, 409));

export const options = {
  scenarios: {
    // 50 miembros intentan reservar LA MISMA sala a LA MISMA hora
    same_slot_race: { executor: 'per-vu-iterations', vus: 50, iterations: 1, exec: 'sameSlotRace' },
    // Hora pico: rampa de usuarios reservando salas y horarios aleatorios
    morning_peak: {
      executor: 'ramping-vus',
      startTime: '5s',
      stages: [
        { duration: '15s', target: 30 },
        { duration: '30s', target: 30 },
        { duration: '10s', target: 0 },
      ],
      exec: 'morningPeak',
    },
  },
  thresholds: {
    double_bookings: ['count==0'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:morning_peak}': ['p(95)<800'],
  },
};

const json = (body, token) => ({
  headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
});

export function setup() {
  const admin = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }), json()).json();
  const adminToken = admin.accessToken;

  const location = http
    .post(`${BASE}/api/locations`, JSON.stringify({ name: `Sede k6 ${Date.now()}`, city: 'Montería', address: 'Calle 1 # 2-3' }), json(null, adminToken))
    .json();
  const rooms = [];
  for (let i = 0; i < ROOMS; i++) {
    const room = http
      .post(`${BASE}/api/rooms`, JSON.stringify({ locationId: location.id, name: `Sala ${i}`, capacity: 6, equipment: { projector: true } }), json(null, adminToken))
      .json();
    rooms.push(room.id);
  }

  // Miembro con plan que incluye salas (así la saga confirma sin cargo adicional)
  const email = `k6-${Date.now()}@test.co`;
  const member = http.post(`${BASE}/api/auth/register`, JSON.stringify({ name: 'Miembro k6', email, password: 'Password123!' }), json()).json();
  const plans = http.get(`${BASE}/api/plans`).json();
  const plan = plans.find((p) => p.code === 'PRIVATE_OFFICE');
  http.post(`${BASE}/api/subscriptions`, JSON.stringify({ planId: plan.id }), json(null, member.accessToken));

  const day = new Date(Date.now() + 3 * 86400000);
  day.setUTCHours(13, 0, 0, 0); // 8:00 a. m. hora Colombia
  return { token: member.accessToken, rooms, raceRoom: rooms[0], raceStart: day.toISOString(), baseDay: day.getTime() };
}

export function sameSlotRace(data) {
  const end = new Date(new Date(data.raceStart).getTime() + 3600000).toISOString();
  const res = http.post(
    `${BASE}/api/bookings`,
    JSON.stringify({ resourceType: 'ROOM', resourceId: data.raceRoom, startTime: data.raceStart, endTime: end }),
    json(null, data.token),
  );
  check(res, { 'carrera: 201 o 409': (r) => r.status === 201 || r.status === 409 });
  if (res.status === 201) bookingsCreated.add(1);
  if (res.status === 409) bookingConflicts.add(1);
}

export function morningPeak(data) {
  const room = data.rooms[1 + Math.floor(Math.random() * (data.rooms.length - 1))];
  const hour = Math.floor(Math.random() * 40); // 40 franjas de 1 h en los días siguientes
  const start = new Date(data.baseDay + 86400000 + hour * 3600000);
  const end = new Date(start.getTime() + 3600000);
  const res = http.post(
    `${BASE}/api/bookings`,
    JSON.stringify({ resourceType: 'ROOM', resourceId: room, startTime: start.toISOString(), endTime: end.toISOString() }),
    json(null, data.token),
  );
  check(res, { 'pico: 201 o 409': (r) => r.status === 201 || r.status === 409 });
  if (res.status === 201) bookingsCreated.add(1);
  if (res.status === 409) bookingConflicts.add(1);
  sleep(0.2);
}

export function teardown(data) {
  // Verificación final: la sala disputada debe tener exactamente UNA reserva activa
  const from = data.raceStart;
  const to = new Date(new Date(from).getTime() + 3600000).toISOString();
  const res = http.get(`${BASE}/api/bookings/availability?resourceId=${data.raceRoom}&from=${from}&to=${to}`, json(null, data.token));
  const busy = res.json().busy.length;
  check(busy, { 'exactamente una reserva ganadora': (n) => n === 1 });
  if (busy !== 1) doubleBookings.add(Math.max(busy - 1, 1));
}
