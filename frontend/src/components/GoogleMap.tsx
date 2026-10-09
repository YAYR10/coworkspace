import type { Location } from '../api';

/**
 * Mapa de Google por iframe (gratis, sin clave de API).
 * Usa las coordenadas si la sede las tiene; si no, Google busca la dirección escrita.
 */
export const mapQuery = (l: Pick<Location, 'latitude' | 'longitude' | 'address' | 'city' | 'country' | 'name'>) =>
  typeof l.latitude === 'number' && typeof l.longitude === 'number'
    ? `${l.latitude},${l.longitude}`
    : [l.address, l.city, l.country].filter(Boolean).join(', ');

export const directionsUrl = (l: Parameters<typeof mapQuery>[0]) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery(l))}`;

export const mapsUrl = (l: Parameters<typeof mapQuery>[0]) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(l))}`;

export function GoogleMap({
  query,
  zoom = 15,
  title,
  className = '',
}: {
  query: string;
  zoom?: number;
  title: string;
  className?: string;
}) {
  if (!query.trim()) return <div className={`gmap gmap-empty ${className}`}>Sin dirección para mostrar en el mapa.</div>;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=es&output=embed`;
  return <iframe className={`gmap ${className}`} title={title} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
}
