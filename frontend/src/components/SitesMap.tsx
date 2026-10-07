import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { Location } from '../api';
import type { Coords } from '../location';

const TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Pin dibujado en SVG (evita los íconos por defecto de Leaflet, que se rompen al empaquetar). */
const pin = (variant: 'site' | 'on' | 'me') =>
  L.divIcon({
    className: `map-pin map-pin-${variant}`,
    html:
      variant === 'me'
        ? '<span class="map-me"></span>'
        : '<svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><path d="M12 31s10-10.2 10-18A10 10 0 0 0 2 13c0 7.8 10 18 10 18z"/><circle cx="12" cy="12.5" r="3.6"/></svg>',
    iconSize: variant === 'me' ? [18, 18] : [26, 34],
    iconAnchor: variant === 'me' ? [9, 9] : [13, 33],
  });

function baseMap(el: HTMLElement) {
  const map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
  L.tileLayer(TILES, { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
  return map;
}

const hasCoords = (l: Location): l is Location & { latitude: number; longitude: number } =>
  typeof l.latitude === 'number' && typeof l.longitude === 'number';

/** Mapa de sedes: un pin por sede con coordenadas; clic en el pin = elegir la sede. */
export function SitesMap({
  locations,
  selectedId,
  onSelect,
  me,
}: {
  locations: Location[];
  selectedId: string;
  onSelect: (id: string) => void;
  me: Coords | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    map.current = baseMap(el.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const points: L.LatLngExpression[] = [];
    locations.filter(hasCoords).forEach((l) => {
      const marker = L.marker([l.latitude, l.longitude], { icon: pin(l.id === selectedId ? 'on' : 'site'), title: l.name, keyboard: true })
        .bindTooltip(`${l.name}, ${l.city}`, { direction: 'top', offset: [0, -30] })
        .on('click', () => selectRef.current(l.id));
      marker.addTo(g);
      points.push([l.latitude, l.longitude]);
    });
    if (me) {
      L.marker([me.lat, me.lng], { icon: pin('me'), title: 'Tu ubicación', interactive: false }).addTo(g);
    }
    const selected = locations.find((l) => l.id === selectedId);
    if (selected && hasCoords(selected)) m.setView([selected.latitude, selected.longitude], 14, { animate: true });
    else if (points.length === 1) m.setView(points[0], 13);
    else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    else m.setView([4.6, -74.1], 4);
  }, [locations, selectedId, me]);

  return <div ref={el} className="sites-map" role="region" aria-label="Mapa de sedes" />;
}

/** Selector de punto para el coordinador: clic en el mapa = coordenadas de la sede. */
export function MapPicker({ value, onChange }: { value: Coords | null; onChange: (c: Coords) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (!el.current) return;
    const m = baseMap(el.current);
    map.current = m;
    m.setView(value ? [value.lat, value.lng] : [4.6, -74.1], value ? 15 : 5);
    m.on('click', (e: L.LeafletMouseEvent) => changeRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) marker.current = L.marker([value.lat, value.lng], { icon: pin('on') }).addTo(m);
    else marker.current.setLatLng([value.lat, value.lng]);
    if (!m.getBounds().contains([value.lat, value.lng])) m.setView([value.lat, value.lng], Math.max(m.getZoom(), 15));
  }, [value]);

  return <div ref={el} className="picker-map" role="region" aria-label="Haz clic en el mapa para ubicar la sede" />;
}

/** Busca la dirección en OpenStreetMap (Nominatim). */
export async function geocode(query: string): Promise<Coords | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  const data = (await res.json()) as { lat: string; lon: string }[];
  return data[0] ? { lat: +(+data[0].lat).toFixed(6), lng: +(+data[0].lon).toFixed(6) } : null;
}
