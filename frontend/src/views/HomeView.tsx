import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, CountryInfo, Plan } from '../api';
import { useAuth } from '../components/Auth';
import { GoogleMap, mapQuery, mapsUrl } from '../components/GoogleMap';
import { GridIcon, MapIcon, PinIcon, SearchIcon } from '../components/icons';
import { ListingCard } from '../components/ListingCard';
import { Notice } from '../components/ui';
import { Listing, useCatalog } from '../catalog';
import { EQUIPMENT, money, plural } from '../format';
import { useLoad } from '../hooks';
import { ALL, Coords, detectByGps, distanceKm, guessCountry, sameCountry, setCountry, useCoords, useCountry } from '../location';
import { navigate } from '../router';

type Kind = 'ANY' | 'ROOM' | 'DESK';
type Sort = 'recommended' | 'near' | 'name';

const ACCESS: Record<string, string> = { ROOM: 'Salas de reunión', DESK: 'Puestos de trabajo' };
const kmTo = (coords: Coords | null, l: Listing) =>
  coords && typeof l.latitude === 'number' && typeof l.longitude === 'number' ? distanceKm(coords, { lat: l.latitude, lng: l.longitude }) : null;

export function HomeView() {
  const stored = useCountry();
  const coords = useCoords();
  const { requireLogin } = useAuth();
  const countries = useLoad(() => api.get<CountryInfo[]>('/api/locations/countries'));
  const plans = useLoad(() => api.get<Plan[]>('/api/plans'));

  // País por defecto: el elegido antes; si no, el de la zona horaria si tiene sedes; si no, todos.
  useEffect(() => {
    if (stored || !countries.data) return;
    const guess = guessCountry();
    const match = countries.data.find((c) => sameCountry(c.country, guess));
    setCountry(match ? match.country : ALL);
  }, [stored, countries.data]);
  const country = stored ?? ALL;

  const catalog = useCatalog(country);
  const [city, setCity] = useState('');
  const [kind, setKind] = useState<Kind>('ANY');
  const [people, setPeople] = useState(1);
  const [chips, setChips] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('recommended');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [hovered, setHovered] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const results = useRef<HTMLElement>(null);

  useEffect(() => {
    setCity('');
    setChips([]);
  }, [country]);
  useEffect(() => {
    if (coords) setSort('near');
  }, [coords]);

  const cities = countries.data?.find((c) => sameCountry(c.country, country))?.cities ?? [];

  // Filtros sugeridos: los servicios y equipos más comunes entre las sedes del país
  const chipOptions = useMemo(() => {
    const count = new Map<string, number>();
    (catalog.data ?? []).forEach((l) => {
      l.services.forEach((s) => count.set(s, (count.get(s) ?? 0) + 1));
      l.equipment.forEach((e) => EQUIPMENT[e] && count.set(EQUIPMENT[e], (count.get(EQUIPMENT[e]) ?? 0) + 1));
    });
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k]) => k);
  }, [catalog.data]);

  const filtered = useMemo(() => {
    const list = (catalog.data ?? []).filter((l) => {
      if (city && l.city !== city) return false;
      if (kind === 'ROOM' && l.rooms.length === 0) return false;
      if (kind === 'DESK' && l.desks.length === 0) return false;
      if (people > 1 && l.maxCapacity < people) return false;
      const has = (chip: string) => l.services.includes(chip) || l.equipment.some((e) => EQUIPMENT[e] === chip);
      return chips.every(has);
    });
    const spaces = (l: Listing) => l.rooms.length + l.desks.length;
    if (sort === 'near' && coords) return list.sort((a, b) => (kmTo(coords, a) ?? 1e9) - (kmTo(coords, b) ?? 1e9));
    if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list.sort((a, b) => Number(!!b.photoUrl) - Number(!!a.photoUrl) || spaces(b) - spaces(a));
  }, [catalog.data, city, kind, people, chips, sort, coords]);

  const focus = filtered.find((l) => l.id === hovered) ?? filtered[0];
  const showCountry = country === ALL;
  const place = country === ALL ? 'todos los países' : city ? `${city}, ${country}` : country;

  const search = (e: FormEvent) => {
    e.preventDefault();
    results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const nearMe = async () => {
    setLocating(true);
    setGeoMsg(null);
    try {
      const found = await detectByGps();
      const match = countries.data?.find((c) => sameCountry(c.country, found.country));
      if (match) setCountry(match.country);
      else setGeoMsg(`Estás en ${found.country}, donde aún no hay sedes. Te mostramos todas, ordenadas por distancia.`);
      if (!match) setCountry(ALL);
      setSort('near');
      setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setGeoMsg((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const toggleChip = (c: string) => setChips(chips.includes(c) ? chips.filter((x) => x !== c) : [...chips, c]);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Oficinas, salas y puestos de trabajo por horas.</h1>
          <p className="hero-lede">
            Encuentra una sede cerca, mira la disponibilidad en tiempo real y reserva en minutos. Pagas las horas que usas o eliges un plan mensual.
          </p>

          <form className="searchbar" onSubmit={search} role="search">
            <label className="sb-field sb-where">
              <span className="sb-label">Dónde</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value={ALL}>Todos los países</option>
                {countries.data?.map((c) => (
                  <option key={c.country} value={c.country}>{c.country}</option>
                ))}
              </select>
            </label>
            <label className="sb-field">
              <span className="sb-label">Ciudad</span>
              <select value={city} onChange={(e) => setCity(e.target.value)} disabled={country === ALL || cities.length === 0}>
                <option value="">{country === ALL ? 'Elige un país' : 'Todas'}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="sb-field">
              <span className="sb-label">Qué necesitas</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                <option value="ANY">Cualquier espacio</option>
                <option value="ROOM">Sala de reunión</option>
                <option value="DESK">Puesto de trabajo</option>
              </select>
            </label>
            <label className="sb-field sb-people">
              <span className="sb-label">Personas</span>
              <input type="number" min={1} max={60} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <button className="btn btn-accent sb-go">
              <SearchIcon /> Buscar
            </button>
          </form>
          <button className="hero-near" onClick={() => void nearMe()} disabled={locating}>
            <PinIcon size={18} /> {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación para ver las sedes más cercanas'}
          </button>
          {geoMsg && <p className="hero-msg">{geoMsg}</p>}
        </div>
      </section>

      <section className="results container" ref={results} aria-labelledby="results-title">
        <div className="results-head">
          <div>
            <h2 id="results-title" className="results-title">
              {catalog.data ? `${plural(filtered.length, 'sede', 'sedes')} en ${place}` : `Sedes en ${place}`}
            </h2>
            {coords && sort === 'near' && <p className="results-sub">Ordenadas por cercanía a tu ubicación.</p>}
          </div>
          <div className="results-tools">
            <label className="field field-inline">
              <span>Ordenar</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recommended">Recomendadas</option>
                <option value="near" disabled={!coords}>Más cercanas{coords ? '' : ' (usa tu ubicación)'}</option>
                <option value="name">Nombre</option>
              </select>
            </label>
            <div className="switch" role="tablist" aria-label="Vista">
              <button role="tab" aria-selected={view === 'grid'} onClick={() => setView('grid')}><GridIcon size={16} /> Lista</button>
              <button role="tab" aria-selected={view === 'map'} onClick={() => setView('map')}><MapIcon size={16} /> Mapa</button>
            </div>
          </div>
        </div>

        {chipOptions.length > 0 && (
          <div className="filter-chips" role="group" aria-label="Filtrar por servicios">
            {chipOptions.map((c) => (
              <button key={c} className={`chip chip-toggle${chips.includes(c) ? ' is-on' : ''}`} aria-pressed={chips.includes(c)} onClick={() => toggleChip(c)}>
                {c}
              </button>
            ))}
            {chips.length > 0 && <button className="link" onClick={() => setChips([])}>Quitar filtros</button>}
          </div>
        )}

        {catalog.error && <Notice tone="error">{catalog.error}</Notice>}
        {catalog.loading && !catalog.data && (
          <div className="listing-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="listing listing-skeleton" />)}
          </div>
        )}
        {catalog.data && filtered.length === 0 && (
          <div className="empty empty-lg">
            <p className="empty-title">No encontramos sedes con esos filtros</p>
            <div className="empty-body">
              Prueba con otra ciudad, menos personas o quita algún filtro.
              {country !== ALL && <button className="btn btn-ghost" onClick={() => setCountry(ALL)}>Ver todos los países</button>}
            </div>
          </div>
        )}

        {filtered.length > 0 && view === 'grid' && (
          <div className="listing-grid">
            {filtered.map((l) => <ListingCard key={l.id} listing={l} km={kmTo(coords, l)} showCountry={showCountry} />)}
          </div>
        )}

        {filtered.length > 0 && view === 'map' && (
          <div className="split">
            <div className="split-list">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} km={kmTo(coords, l)} showCountry={showCountry} active={focus?.id === l.id} onHover={setHovered} />
              ))}
            </div>
            {focus && (
              <aside className="split-map" aria-label={`Ubicación de ${focus.name}`}>
                <GoogleMap query={mapQuery(focus)} title={`Mapa de ${focus.name}`} />
                <p className="split-map-caption">
                  <strong>{focus.name}</strong> · {focus.address}, {focus.city}
                  <a href={mapsUrl(focus)} target="_blank" rel="noreferrer">Abrir en Google Maps</a>
                </p>
              </aside>
            )}
          </div>
        )}
      </section>

      <section className="how container" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">Así de simple</h2>
        <ol className="how-steps">
          <li>
            <strong>Encuentra una sede</strong>
            <span>Filtra por ciudad, tipo de espacio y servicios, o deja que te mostremos las más cercanas.</span>
          </li>
          <li>
            <strong>Elige el espacio y el horario</strong>
            <span>Ves las horas libres de cada sala y puesto, y el precio antes de confirmar.</span>
          </li>
          <li>
            <strong>Confirma tu reserva</strong>
            <span>Te pedimos iniciar sesión solo en este paso. La confirmación llega en segundos.</span>
          </li>
        </ol>
      </section>

      <section className="plans-band" id="planes" aria-labelledby="plans-title">
        <div className="container">
          <h2 id="plans-title" className="section-title">Planes mensuales</h2>
          <p className="section-lede">Si trabajas seguido en una sede, un plan te sale mejor. Lo que tu plan no incluye se cobra por hora.</p>
          {plans.data && (
            <ul className="plan-grid">
              {plans.data.map((p) => (
                <li key={p.id} className="plan-card">
                  <h3>{p.name}</h3>
                  <p className="plan-card-price">{money(p.price)} <small>al mes</small></p>
                  <p className="plan-card-desc">{p.description}</p>
                  <ul className="plan-card-access">
                    {p.resourceAccess.map((r) => <li key={r}>{ACCESS[r]}</li>)}
                  </ul>
                  <button className="btn btn-ghost" onClick={() => requireLogin(`Crea tu cuenta para suscribirte al plan ${p.name}.`, () => navigate('/cuenta/membresia'))}>
                    Elegir plan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
