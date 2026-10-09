import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Desk, Location, Room } from '../../api';
import { PhotoField } from '../../components/PhotoField';
import { ServicesPicker } from '../../components/ServicesPicker';
import { GoogleMap, mapQuery } from '../../components/GoogleMap';
import { Empty, Loading, Notice, PageHead } from '../../components/ui';
import { EQUIPMENT } from '../../format';
import { errorText, useLoad } from '../../hooks';
import { ALL, countryFilter, geocode, getCountry, sameCountry } from '../../location';

type LocationDetail = Location & { rooms: Room[]; desks: Desk[] };
type Msg = { tone: 'ok' | 'error'; text: string } | null;

/** Coordinador y administrador: publicar sedes, sus servicios, salas y puestos. */
export function LocationsView({ isAdmin }: { isAdmin: boolean }) {
  const locations = useLoad(() => api.get<Location[]>('/api/locations?all=true'));
  const [countryTab, setCountryTab] = useState<string>(() => countryFilter(getCountry()) ?? ALL);
  const [selected, setSelected] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const countries = useMemo(() => {
    const set = new Map<string, string>();
    (locations.data ?? []).forEach((l) => set.set(l.country.toLowerCase(), l.country));
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [locations.data]);
  const visible = (locations.data ?? []).filter((l) => countryTab === ALL || sameCountry(l.country, countryTab));

  useEffect(() => {
    if (!creating && !selected && visible.length) setSelected(visible[0].id);
  }, [visible, selected, creating]);

  const loadDetail = async (id = selected) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await api.get<LocationDetail>(`/api/locations/${id}`));
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    }
  };
  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const done = async (text: string) => {
    setMsg({ tone: 'ok', text });
    await locations.reload();
    await loadDetail();
  };
  const fail = (e: unknown) => setMsg({ tone: 'error', text: errorText(e) });

  const published = (locations.data ?? []).filter((l) => l.isPublished).length;
  const [seeding, setSeeding] = useState(false);
  const seedDemo = async () => {
    setSeeding(true);
    try {
      const r = await api.post<{ created: number; total: number }>('/api/locations/demo');
      await done(r.created ? `Se crearon ${r.created} sedes de ejemplo en Colombia, México, Perú y España.` : 'Las sedes de ejemplo ya existían.');
      setCountryTab(ALL);
    } catch (e) {
      fail(e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <PageHead title="Sedes y servicios">
        Crea sedes, define sus servicios y publícalas. Una sede oculta no aparece para los miembros ni se puede reservar.
      </PageHead>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="toolbar">
        <div className="switch switch-wrap" role="tablist" aria-label="País">
          <button role="tab" aria-selected={countryTab === ALL} onClick={() => setCountryTab(ALL)}>Todos</button>
          {countries.map((c) => (
            <button key={c} role="tab" aria-selected={sameCountry(countryTab, c)} onClick={() => setCountryTab(c)}>{c}</button>
          ))}
        </div>
        <p className="toolbar-note">{published} publicadas de {locations.data?.length ?? 0}</p>
        {isAdmin && (
          <button className="btn btn-ghost" disabled={seeding} onClick={() => void seedDemo()} title="Crea sedes con fotos, servicios y ubicación en varios países">
            {seeding ? 'Creando…' : 'Crear sedes de ejemplo'}
          </button>
        )}
        <button className="btn btn-primary" onClick={() => { setCreating(true); setSelected(''); setDetail(null); }}>Nueva sede</button>
      </div>

      <div className="admin-grid">
        <section className="block">
          <h2>Sedes</h2>
          {locations.loading && <Loading />}
          {locations.data && visible.length === 0 && <Empty title="No hay sedes en este país">Crea una con el botón Nueva sede.</Empty>}
          <ul className="rows">
            {visible.map((l) => (
              <li key={l.id} className={`row row-pick${selected === l.id ? ' is-current' : ''}`}>
                <button className="row-main row-btn" onClick={() => { setCreating(false); setSelected(l.id); }} aria-pressed={selected === l.id}>
                  <span className="row-title">{l.name}</span>
                  <span className="row-sub">{l.city}, {l.country}</span>
                </button>
                <span className={`tag ${l.isPublished ? 'tag-confirmed' : 'tag-hidden'}`}>{l.isPublished ? 'Publicada' : 'Oculta'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="block">
          {creating && (
            <LocationForm
              title="Nueva sede"
              initial={{ country: countryTab === ALL ? countryFilter(getCountry()) ?? 'Colombia' : countryTab }}
              submitLabel="Crear sede"
              onCancel={() => setCreating(false)}
              onSubmit={async (body) => {
                try {
                  const l = await api.post<Location>('/api/locations', body);
                  setCreating(false);
                  setCountryTab(l.country);
                  setSelected(l.id);
                  await done(`Sede ${l.name} creada${l.isPublished ? ' y publicada' : ' como oculta'}.`);
                } catch (e) {
                  fail(e);
                }
              }}
            />
          )}
          {!creating && !detail && <Empty title="Elige una sede">Sus datos, servicios, salas y puestos aparecen aquí.</Empty>}
          {!creating && detail && <LocationDetailPanel key={detail.id} detail={detail} onDone={done} onError={fail} />}
        </section>
      </div>
    </>
  );
}

type LocationBody = {
  name: string; country: string; city: string; address: string; description?: string; services: string[]; isPublished: boolean;
  latitude: number | null; longitude: number | null;
};

function LocationForm({
  title,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: Partial<Location>;
  submitLabel: string;
  onSubmit: (body: LocationBody) => Promise<void>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<LocationBody>({
    name: initial.name ?? '',
    country: initial.country ?? 'Colombia',
    city: initial.city ?? '',
    address: initial.address ?? '',
    description: initial.description ?? '',
    services: initial.services ?? [],
    isPublished: initial.isPublished ?? true,
    latitude: initial.latitude ?? null,
    longitude: initial.longitude ?? null,
  });
  const [busy, setBusy] = useState(false);
  // Vista previa del mapa: se actualiza cuando dejas de escribir la dirección
  const addressText = [f.address, f.city, f.country].map((x) => x.trim()).filter(Boolean).join(', ');
  const [preview, setPreview] = useState(addressText);
  useEffect(() => {
    const t = setTimeout(() => setPreview(addressText), 700);
    return () => clearTimeout(t);
  }, [addressText]);
  const original = [initial.address, initial.city, initial.country].filter(Boolean).join(', ');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let { latitude, longitude } = f;
    // Coordenadas automáticas (para "la sede más cercana") si la dirección es nueva o cambió
    if (latitude === null || addressText !== original) {
      const found = await geocode(addressText).catch(() => null);
      latitude = found?.lat ?? null;
      longitude = found?.lng ?? null;
    }
    await onSubmit({ ...f, latitude, longitude, name: f.name.trim(), description: f.description?.trim() || undefined });
    setBusy(false);
  };
  return (
    <form className="form" onSubmit={submit}>
      <h2>{title}</h2>
      <label className="field"><span>Nombre</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} /></label>
      <div className="field-row">
        <label className="field"><span>País</span><input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} required minLength={2} /></label>
        <label className="field"><span>Ciudad</span><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required /></label>
      </div>
      <label className="field"><span>Dirección</span><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required /></label>
      <label className="field">
        <span>Descripción</span>
        <textarea rows={3} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Qué hace especial a esta sede" />
      </label>
      <div className="field">
        <span>Así se verá en el mapa</span>
        <GoogleMap query={preview} zoom={16} title="Vista previa de la ubicación" className="form-map" />
        <small>Si el punto no coincide, revisa la dirección (por ejemplo: "Cra 7 # 72-41") y la ciudad.</small>
      </div>
      <ServicesPicker value={f.services} onChange={(services) => setF({ ...f, services })} />
      <label className="check">
        <input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />
        Publicada (visible para los miembros)
      </label>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancelar</button>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
      </div>
    </form>
  );
}

function LocationDetailPanel({ detail, onDone, onError }: { detail: LocationDetail; onDone: (t: string) => Promise<void>; onError: (e: unknown) => void }) {
  const [editing, setEditing] = useState(false);

  const togglePublish = () =>
    api
      .patch(`/api/locations/${detail.id}`, { isPublished: !detail.isPublished })
      .then(() => onDone(detail.isPublished ? `${detail.name} quedó oculta.` : `${detail.name} quedó publicada.`))
      .catch(onError);
  const toggleRoom = (r: Room) => api.patch(`/api/rooms/${r.id}`, { isActive: !r.isActive }).then(() => onDone(`${r.name} ${r.isActive ? 'deshabilitada' : 'habilitada'}.`)).catch(onError);
  const toggleDesk = (d: Desk) => api.patch(`/api/desks/${d.id}`, { isActive: !d.isActive }).then(() => onDone(`Puesto ${d.code} ${d.isActive ? 'deshabilitado' : 'habilitado'}.`)).catch(onError);

  if (editing)
    return (
      <LocationForm
        title={`Editar ${detail.name}`}
        initial={detail}
        submitLabel="Guardar cambios"
        onCancel={() => setEditing(false)}
        onSubmit={async (body) => {
          try {
            await api.patch(`/api/locations/${detail.id}`, body);
            setEditing(false);
            await onDone('Sede actualizada.');
          } catch (e) {
            onError(e);
          }
        }}
      />
    );

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <h2>{detail.name}</h2>
          <p className="row-sub">{detail.address}, {detail.city}, {detail.country}</p>
        </div>
        <span className={`tag ${detail.isPublished ? 'tag-confirmed' : 'tag-hidden'}`}>{detail.isPublished ? 'Publicada' : 'Oculta'}</span>
      </div>
      <PhotoField location={detail} onChanged={(t) => void onDone(t)} />
      {detail.description && <p>{detail.description}</p>}
      <GoogleMap query={mapQuery(detail)} title={`Mapa de ${detail.name}`} className="form-map" />
      <div className="chips">
        {detail.services.length === 0 && <span className="hint">Sin servicios publicados.</span>}
        {detail.services.map((s) => <span key={s} className="chip">{s}</span>)}
      </div>
      <div className="form-actions form-actions-start">
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>Editar sede y servicios</button>
        <button className={`btn ${detail.isPublished ? 'btn-quiet' : 'btn-primary'}`} onClick={() => void togglePublish()}>
          {detail.isPublished ? 'Ocultar sede' : 'Publicar sede'}
        </button>
      </div>

      <h3 className="sub">Salas</h3>
      {detail.rooms.length === 0 && <p className="hint">Esta sede aún no tiene salas.</p>}
      <ul className="rows">
        {detail.rooms.map((r) => (
          <li key={r.id} className={`row${r.isActive ? '' : ' is-off'}`}>
            <div className="row-main">
              <p className="row-title">{r.name}</p>
              <p className="row-sub">
                {r.capacity} personas
                {Object.entries(r.equipment ?? {}).filter(([, v]) => v).map(([k]) => `, ${EQUIPMENT[k] ?? k}`).join('')}
              </p>
            </div>
            <button className="btn btn-quiet" onClick={() => void toggleRoom(r)}>{r.isActive ? 'Deshabilitar' : 'Habilitar'}</button>
          </li>
        ))}
      </ul>
      <RoomForm locationId={detail.id} onCreated={(r) => void onDone(`Sala ${r.name} creada.`)} onError={onError} />

      <h3 className="sub">Puestos</h3>
      {detail.desks.length === 0 && <p className="hint">Esta sede aún no tiene puestos.</p>}
      <ul className="rows">
        {detail.desks.map((d) => (
          <li key={d.id} className={`row${d.isActive ? '' : ' is-off'}`}>
            <div className="row-main">
              <p className="row-title">Puesto {d.code}</p>
              <p className="row-sub">{d.isDedicated ? 'Dedicado' : 'Flexible'}</p>
            </div>
            <button className="btn btn-quiet" onClick={() => void toggleDesk(d)}>{d.isActive ? 'Deshabilitar' : 'Habilitar'}</button>
          </li>
        ))}
      </ul>
      <DeskForm locationId={detail.id} onCreated={(d) => void onDone(`Puesto ${d.code} creado.`)} onError={onError} />
    </div>
  );
}

function RoomForm({ locationId, onCreated, onError }: { locationId: string; onCreated: (r: Room) => void; onError: (e: unknown) => void }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [equipment, setEquipment] = useState<Record<string, boolean>>({ projector: true });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.post<Room>('/api/rooms', { locationId, name: name.trim(), capacity, equipment });
      setName('');
      onCreated(r);
    } catch (err) {
      onError(err);
    }
  };
  return (
    <form className="form form-compact" onSubmit={submit}>
      <p className="form-title">Nueva sala</p>
      <div className="field-row">
        <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="field field-narrow"><span>Capacidad</span><input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value) || 1)} required /></label>
      </div>
      <fieldset className="checks">
        <legend>Equipamiento</legend>
        {Object.entries(EQUIPMENT).map(([k, label]) => (
          <label key={k} className="check">
            <input type="checkbox" checked={!!equipment[k]} onChange={(e) => setEquipment({ ...equipment, [k]: e.target.checked })} />
            {label}
          </label>
        ))}
      </fieldset>
      <button className="btn btn-ghost">Crear sala</button>
    </form>
  );
}

function DeskForm({ locationId, onCreated, onError }: { locationId: string; onCreated: (d: Desk) => void; onError: (e: unknown) => void }) {
  const [code, setCode] = useState('');
  const [isDedicated, setDedicated] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const d = await api.post<Desk>('/api/desks', { locationId, code: code.trim(), isDedicated });
      setCode('');
      onCreated(d);
    } catch (err) {
      onError(err);
    }
  };
  return (
    <form className="form form-compact form-inline" onSubmit={submit}>
      <p className="form-title">Nuevo puesto</p>
      <label className="field field-narrow"><span>Código</span><input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="A-01" /></label>
      <label className="check">
        <input type="checkbox" checked={isDedicated} onChange={(e) => setDedicated(e.target.checked)} />
        Dedicado
      </label>
      <button className="btn btn-ghost">Crear puesto</button>
    </form>
  );
}
