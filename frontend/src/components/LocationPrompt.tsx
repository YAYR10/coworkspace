import { useState } from 'react';
import { api, CountryInfo } from '../api';
import { useLoad } from '../hooks';
import { ALL, detectByGps, guessCountry, sameCountry, setCountry } from '../location';
import { Brand } from './ServiceStatus';
import { Loading, Notice } from './ui';

/**
 * "¿Dónde quieres trabajar?": se muestra al entrar por primera vez y desde el botón de país del encabezado.
 * Con la ubicación del navegador se elige el país automáticamente si hay sedes allí.
 */
export function LocationPrompt({ onDone, current }: { onDone: () => void; current?: string | null }) {
  const countries = useLoad(() => api.get<CountryInfo[]>('/api/locations/countries'));
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const suggested = guessCountry();

  const choose = (country: string) => {
    setCountry(country);
    onDone();
  };

  const useGps = async () => {
    setDetecting(true);
    setMessage(null);
    try {
      const found = await detectByGps();
      const match = countries.data?.find((c) => sameCountry(c.country, found.country));
      if (match) {
        choose(match.country);
        return;
      }
      setMessage({
        tone: 'info',
        text: `Estás en ${found.country}${found.city ? ` (${found.city})` : ''}, pero aún no tenemos sedes allí. Elige otro país o mira todas las sedes.`,
      });
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message });
    } finally {
      setDetecting(false);
    }
  };

  const sorted = [...(countries.data ?? [])].sort((a, b) =>
    sameCountry(a.country, suggested) ? -1 : sameCountry(b.country, suggested) ? 1 : 0,
  );

  return (
    <main className="where">
      <div className="where-inner">
        <Brand />
        <h1 className="where-title">¿Dónde quieres trabajar?</h1>
        <p className="where-text">Te mostramos las sedes del país que elijas. Puedes cambiarlo cuando quieras desde el encabezado.</p>

        <button className="btn btn-primary where-gps" onClick={() => void useGps()} disabled={detecting || countries.loading}>
          <PinIcon />
          {detecting ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
        </button>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <h2 className="where-sub">O elige un país</h2>
        {countries.loading && <Loading label="Cargando países con sedes…" />}
        {countries.error && <Notice tone="error">{countries.error}</Notice>}
        {countries.data && countries.data.length === 0 && (
          <Notice>Todavía no hay sedes publicadas. Un coordinador puede publicarlas desde su panel.</Notice>
        )}
        <ul className="where-list">
          {sorted.map((c) => (
            <li key={c.country}>
              <button className={`where-option${sameCountry(c.country, current) ? ' is-current' : ''}`} onClick={() => choose(c.country)}>
                <span className="where-country">{c.country}</span>
                <span className="where-cities">{c.cities.join(', ')}</span>
                <span className="where-count">
                  {c.locations} {c.locations === 1 ? 'sede' : 'sedes'}
                </span>
                {sameCountry(c.country, suggested) && <span className="where-hint">Según tu zona horaria</span>}
              </button>
            </li>
          ))}
        </ul>
        <button className="link where-all" onClick={() => choose(ALL)}>
          Ver sedes de todos los países
        </button>
      </div>
    </main>
  );
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
