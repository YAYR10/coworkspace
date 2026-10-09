/** Catálogo público: sedes de un país con sus salas y puestos ya resumidos para la portada. */
import { api, Desk, Location, Room } from './api';
import { HOURLY_RATE } from './format';
import { useLoad } from './hooks';
import { countryFilter } from './location';

export interface Listing extends Location {
  rooms: Room[];
  desks: Desk[];
  maxCapacity: number;
  equipment: string[];
  priceFrom: number | null;
}

export function useCatalog(country: string | null) {
  const c = countryFilter(country);
  return useLoad<Listing[]>(async () => {
    const q = c ? `?country=${encodeURIComponent(c)}` : '';
    const [locations, rooms, desks] = await Promise.all([
      api.get<Location[]>(`/api/locations${q}`),
      api.get<Room[]>(`/api/rooms${q}`),
      api.get<Desk[]>(`/api/desks${q}`),
    ]);
    return locations.map((l) => {
      const r = rooms.filter((x) => x.locationId === l.id);
      const d = desks.filter((x) => x.locationId === l.id);
      const equipment = [...new Set(r.flatMap((x) => Object.entries(x.equipment ?? {}).filter(([, v]) => v).map(([k]) => k)))];
      const priceFrom = d.length ? HOURLY_RATE.DESK : r.length ? HOURLY_RATE.ROOM : null;
      return { ...l, rooms: r, desks: d, maxCapacity: Math.max(0, ...r.map((x) => x.capacity)), equipment, priceFrom };
    });
  }, [c]);
}
