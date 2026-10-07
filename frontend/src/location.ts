/**
 * País donde el usuario quiere trabajar. Se pide al entrar (ubicación del navegador o selección manual)
 * y filtra las sedes que se muestran. Se guarda en el navegador; "*" significa "todos los países".
 */
import { useEffect, useState } from 'react';

const KEY = 'coworkspace.country';
export const ALL = '*';

let current: string | null = (() => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
const listeners = new Set<(c: string | null) => void>();

export const getCountry = () => current;
export function setCountry(country: string | null) {
  current = country;
  try {
    if (country) localStorage.setItem(KEY, country);
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: vive en memoria */
  }
  listeners.forEach((fn) => fn(country));
}

export function useCountry(): string | null {
  const [c, setC] = useState(current);
  useEffect(() => {
    listeners.add(setC);
    return () => {
      listeners.delete(setC);
    };
  }, []);
  return c;
}

/** País para filtrar en la API (undefined = todos). */
export const countryFilter = (c: string | null) => (c && c !== ALL ? c : undefined);

/** Compara nombres de país sin importar tildes ni mayúsculas ("Mexico" = "México"). */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
export const sameCountry = (a?: string | null, b?: string | null) => !!a && !!b && normalize(a) === normalize(b);

/** Sugerencia sin pedir permisos: la zona horaria del navegador. */
const TIMEZONES: [RegExp, string][] = [
  [/^America\/Bogota$/, 'Colombia'],
  [/^America\/(Mexico_City|Monterrey|Cancun|Merida|Tijuana|Chihuahua|Hermosillo|Mazatlan)$/, 'México'],
  [/^America\/Lima$/, 'Perú'],
  [/^America\/Guayaquil$/, 'Ecuador'],
  [/^America\/Caracas$/, 'Venezuela'],
  [/^America\/Panama$/, 'Panamá'],
  [/^America\/Costa_Rica$/, 'Costa Rica'],
  [/^America\/Santiago$/, 'Chile'],
  [/^America\/(Argentina\/.*|Buenos_Aires)$/, 'Argentina'],
  [/^America\/Montevideo$/, 'Uruguay'],
  [/^America\/Asuncion$/, 'Paraguay'],
  [/^America\/La_Paz$/, 'Bolivia'],
  [/^America\/(Sao_Paulo|Bahia|Fortaleza|Manaus|Recife|Belem)$/, 'Brasil'],
  [/^America\/(Santo_Domingo)$/, 'República Dominicana'],
  [/^America\/(Guatemala)$/, 'Guatemala'],
  [/^Europe\/Madrid$/, 'España'],
  [/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix)$/, 'Estados Unidos'],
];
export function guessCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONES.find(([re]) => re.test(tz))?.[1] ?? null;
  } catch {
    return null;
  }
}

export interface Detected {
  country: string;
  city?: string;
}

// ---------------------------------------------------------------- coordenadas del usuario
export interface Coords { lat: number; lng: number }
const COORDS_KEY = 'coworkspace.coords';
let coords: Coords | null = (() => {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
})();
const coordListeners = new Set<(c: Coords | null) => void>();
export function setCoords(next: Coords | null) {
  coords = next;
  try {
    if (next) localStorage.setItem(COORDS_KEY, JSON.stringify(next));
    else localStorage.removeItem(COORDS_KEY);
  } catch {
    /* sin almacenamiento */
  }
  coordListeners.forEach((fn) => fn(next));
}
export function useCoords(): Coords | null {
  const [c, setC] = useState(coords);
  useEffect(() => {
    coordListeners.add(setC);
    return () => {
      coordListeners.delete(setC);
    };
  }, []);
  return c;
}

/** Pide solo las coordenadas (para la sede más cercana). */
export function requestCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu navegador no permite compartir la ubicación.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        const next = { lat: c.latitude, lng: c.longitude };
        setCoords(next);
        resolve(next);
      },
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'No diste permiso de ubicación.' : 'No pudimos obtener tu ubicación.')),
      { timeout: 12_000, maximumAge: 600_000 },
    );
  });
}

/** Distancia en km entre dos puntos (fórmula del haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`);

/** Pide la ubicación al navegador y la convierte en país y ciudad. */
export function detectByGps(): Promise<Detected> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu navegador no permite compartir la ubicación.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.latitude}&longitude=${c.longitude}&localityLanguage=es`;
          const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          const data = await res.json();
          if (!data.countryName) throw new Error('sin país');
          resolve({ country: data.countryName as string, city: (data.city || data.locality || undefined) as string | undefined });
        } catch {
          const guess = guessCountry();
          if (guess) resolve({ country: guess });
          else reject(new Error('No pudimos saber en qué país estás. Elígelo de la lista.'));
        }
      },
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'No diste permiso de ubicación. Elige tu país de la lista.'
              : 'No pudimos obtener tu ubicación. Elige tu país de la lista.',
          ),
        ),
      { timeout: 12_000, maximumAge: 600_000 },
    );
  });
}
