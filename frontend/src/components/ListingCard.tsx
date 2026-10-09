import { useState } from 'react';
import type { Listing } from '../catalog';
import { money, plural } from '../format';
import { formatKm } from '../location';
import { link } from '../router';
import { BuildingIcon, ServiceIcon } from './icons';

export function Photo({ src, alt, className = '' }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div className={`photo photo-empty ${className}`} role="img" aria-label={alt}>
        <BuildingIcon size={40} />
      </div>
    );
  return <img className={`photo ${className}`} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export function ListingCard({
  listing: l,
  km,
  showCountry,
  active,
  onHover,
}: {
  listing: Listing;
  km: number | null;
  showCountry: boolean;
  active?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const spaces = [l.rooms.length ? plural(l.rooms.length, 'sala', 'salas') : null, l.desks.length ? plural(l.desks.length, 'puesto', 'puestos') : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <a
      href={link(`/sede/${l.id}`)}
      className={`listing${active ? ' is-active' : ''}`}
      onMouseEnter={() => onHover?.(l.id)}
      onFocus={() => onHover?.(l.id)}
    >
      <Photo src={l.photoUrl} alt={`Foto de ${l.name}`} className="listing-photo" />
      <div className="listing-body">
        <div className="listing-top">
          <h3 className="listing-name">{l.name}</h3>
          {km !== null && <span className="listing-km">a {formatKm(km)}</span>}
        </div>
        <p className="listing-where">
          {l.city}
          {showCountry ? `, ${l.country}` : ''}
        </p>
        {l.services.length > 0 && (
          <ul className="listing-services" aria-label="Servicios">
            {l.services.slice(0, 4).map((s) => (
              <li key={s} title={s}>
                <ServiceIcon name={s} size={16} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="listing-meta">
          {spaces || 'Sin espacios publicados'}
          {l.maxCapacity > 0 && ` · hasta ${l.maxCapacity} personas`}
        </p>
        {l.priceFrom !== null && (
          <p className="listing-price">
            <strong>{money(l.priceFrom)}</strong> por hora
            <span className="listing-price-note"> · o incluido en tu plan</span>
          </p>
        )}
      </div>
    </a>
  );
}
