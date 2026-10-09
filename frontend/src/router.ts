/**
 * Rutas con hash (funcionan en un sitio estático sin configurar el servidor):
 *   #/                     portada con buscador y sedes
 *   #/sede/<id>            detalle de una sede y reserva
 *   #/cuenta/<sección>     reservas, membresía, pagos, avisos, perfil
 *   #/panel/<sección>      coordinación y administración
 */
import { useEffect, useState } from 'react';

export interface Route {
  name: 'home' | 'site' | 'account' | 'panel';
  param?: string;
}

const LEGACY: Record<string, string> = {
  reservar: '/',
  reservas: '/cuenta/reservas',
  membresia: '/cuenta/membresia',
  pagos: '/cuenta/pagos',
  avisos: '/cuenta/avisos',
  perfil: '/cuenta/perfil',
};

export function parse(hash: string): Route {
  let path = hash.replace(/^#/, '') || '/';
  if (!path.startsWith('/')) path = LEGACY[path] ?? `/panel/${path}`;
  const [, first, second] = path.split('/');
  if (first === 'sede' && second) return { name: 'site', param: decodeURIComponent(second) };
  if (first === 'cuenta') return { name: 'account', param: second || 'reservas' };
  if (first === 'panel') return { name: 'panel', param: second };
  return { name: 'home' };
}

export function navigate(path: string) {
  if (window.location.hash !== `#${path}`) window.location.hash = path;
  window.scrollTo({ top: 0 });
}

export const link = (path: string) => `#${path}`;

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
