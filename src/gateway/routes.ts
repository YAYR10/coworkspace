export interface RouteDefinition {
  prefix: string;
  target: string;
}

export const normalizeUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `http://${url}`).replace(/\/$/, '');

export function serviceUrls(env: NodeJS.ProcessEnv = process.env) {
  return {
    membership: normalizeUrl(env.MEMBERSHIP_SERVICE_URL ?? 'http://localhost:3001'),
    space: normalizeUrl(env.SPACE_SERVICE_URL ?? 'http://localhost:3002'),
    booking: normalizeUrl(env.BOOKING_SERVICE_URL ?? 'http://localhost:3003'),
    billing: normalizeUrl(env.BILLING_SERVICE_URL ?? 'http://localhost:3004'),
    notification: normalizeUrl(env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3005'),
    access: normalizeUrl(env.ACCESS_SERVICE_URL ?? 'http://localhost:3006'),
    community: normalizeUrl(env.COMMUNITY_SERVICE_URL ?? 'http://localhost:3007'),
    analytics: normalizeUrl(env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3008'),
  };
}

/** Tabla de enrutamiento: /api/<recurso> -> microservicio dueño del recurso. */
export function buildRoutes(env: NodeJS.ProcessEnv = process.env): RouteDefinition[] {
  const s = serviceUrls(env);
  return [
    { prefix: '/api/auth', target: s.membership },
    { prefix: '/api/members', target: s.membership },
    { prefix: '/api/plans', target: s.membership },
    { prefix: '/api/subscriptions', target: s.membership },
    { prefix: '/api/locations', target: s.space },
    { prefix: '/api/rooms', target: s.space },
    { prefix: '/api/desks', target: s.space },
    { prefix: '/api/bookings', target: s.booking },
    { prefix: '/api/invoices', target: s.billing },
    { prefix: '/api/charges', target: s.billing },
    { prefix: '/api/payments', target: s.billing },
    { prefix: '/api/notifications', target: s.notification },
    { prefix: '/api/access', target: s.access },
    { prefix: '/api/community', target: s.community },
    { prefix: '/api/analytics', target: s.analytics },
  ];
}

/** Rutas que no requieren JWT. */
export const PUBLIC_ROUTES: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^\/api\/auth\/(register|login|refresh|logout)\/?$/ },
  { method: 'GET', pattern: /^\/api\/plans\/?$/ },
  { method: 'GET', pattern: /^\/api\/(locations|rooms|desks)(\/.*)?$/ },
  // Horarios ocupados de un espacio (sin datos de quién reservó): la portada los muestra sin iniciar sesión
  { method: 'GET', pattern: /^\/api\/bookings\/availability\/?$/ },
  // Próximos eventos de networking de cada sede
  { method: 'GET', pattern: /^\/api\/community\/events\/?$/ },
  // Pasarela de pagos: ¿está en sandbox? y webhook que llama Wompi (se valida con firma, no con JWT)
  { method: 'GET', pattern: /^\/api\/payments\/status\/?$/ },
  { method: 'POST', pattern: /^\/api\/payments\/wompi\/webhook\/?$/ },
];

/** Endpoints internos entre servicios que nunca se exponen hacia afuera. */
export const INTERNAL_ONLY: RegExp[] = [/^\/api\/subscriptions\/member\//, /^\/api\/members\/[^/]+\/contact\/?$/];
