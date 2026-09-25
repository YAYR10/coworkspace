import { FormEvent, useEffect, useState } from 'react';
import { api, Desk, Invoice, Location, Room } from '../api';
import { Empty, Loading, Notice, PageHead } from '../components/ui';
import { EQUIPMENT, money } from '../format';
import { errorText, useLoad } from '../hooks';

type LocationDetail = Location & { rooms: Room[]; desks: Desk[] };

export function AdminView() {
  const locations = useLoad(() => api.get<Location[]>('/api/locations'));
  const [selected, setSelected] = useState<string>('');
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selected && locations.data?.length) setSelected(locations.data[0].id);
  }, [locations.data, selected]);

  const loadDetail = async (id = selected) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await api.get<LocationDetail>(`/api/locations/${id}`));
    } catch (e) {
      setMessage({ tone: 'error', text: errorText(e) });
    }
  };
  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const done = async (text: string) => {
    setMessage({ tone: 'ok', text });
    await locations.reload();
    await loadDetail();
  };
  const fail = (e: unknown) => setMessage({ tone: 'error', text: errorText(e) });

  const toggleRoom = (r: Room) => api.patch(`/api/rooms/${r.id}`, { isActive: !r.isActive }).then(() => done(`${r.name} ${r.isActive ? 'deshabilitada' : 'habilitada'}.`)).catch(fail);
  const toggleDesk = (d: Desk) => api.patch(`/api/desks/${d.id}`, { isActive: !d.isActive }).then(() => done(`Puesto ${d.code} ${d.isActive ? 'deshabilitado' : 'habilitado'}.`)).catch(fail);

  return (
    <>
      <PageHead title="Administrar">Crea sedes, salas y puestos. Un espacio deshabilitado deja de aparecer para reservar.</PageHead>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="admin-grid">
        <section className="block">
          <h2>Sedes</h2>
          {locations.loading && <Loading />}
          {locations.data?.length === 0 && <Empty title="No hay sedes">Crea la primera con el formulario.</Empty>}
          <ul className="rows">
            {locations.data?.map((l) => (
              <li key={l.id} className={`row row-pick${selected === l.id ? ' is-current' : ''}`}>
                <button className="row-main row-btn" onClick={() => setSelected(l.id)} aria-pressed={selected === l.id}>
                  <span className="row-title">{l.name}</span>
                  <span className="row-sub">{l.address}, {l.city}</span>
                </button>
                <span className="row-count">{l._count?.rooms ?? 0} salas, {l._count?.desks ?? 0} puestos</span>
              </li>
            ))}
          </ul>
          <LocationForm onCreated={(l) => { setSelected(l.id); void done(`Sede ${l.name} creada.`); }} onError={fail} />
        </section>

        <section className="block">
          <h2>{detail ? `Espacios en ${detail.name}` : 'Espacios'}</h2>
          {!detail && <Empty title="Elige una sede">Sus salas y puestos aparecen aquí.</Empty>}
          {detail && (
            <>
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
              <RoomForm locationId={detail.id} onCreated={(r) => void done(`Sala ${r.name} creada.`)} onError={fail} />

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
              <DeskForm locationId={detail.id} onCreated={(d) => void done(`Puesto ${d.code} creado.`)} onError={fail} />
            </>
          )}
        </section>
      </div>

      <AllInvoices />
    </>
  );
}

function LocationForm({ onCreated, onError }: { onCreated: (l: Location) => void; onError: (e: unknown) => void }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('Montería');
  const [address, setAddress] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const l = await api.post<Location>('/api/locations', { name: name.trim(), city: city.trim(), address: address.trim() });
      setName('');
      setAddress('');
      onCreated(l);
    } catch (err) {
      onError(err);
    }
  };
  return (
    <form className="form form-compact" onSubmit={submit}>
      <p className="form-title">Nueva sede</p>
      <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
      <div className="field-row">
        <label className="field"><span>Ciudad</span><input value={city} onChange={(e) => setCity(e.target.value)} required /></label>
        <label className="field"><span>Dirección</span><input value={address} onChange={(e) => setAddress(e.target.value)} required /></label>
      </div>
      <button className="btn btn-ghost">Crear sede</button>
    </form>
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

function AllInvoices() {
  const invoices = useLoad(() => api.get<Invoice[]>('/api/invoices'));
  const total = (invoices.data ?? []).filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  return (
    <section className="block">
      <h2>Facturación de todos los miembros</h2>
      {invoices.loading && <Loading />}
      {invoices.error && <Notice tone="error">{invoices.error}</Notice>}
      {invoices.data && invoices.data.length === 0 && <Empty title="Aún no hay facturas" />}
      {invoices.data && invoices.data.length > 0 && (
        <p className="total">
          {invoices.data.length} facturas, {money(total)} recaudado.
        </p>
      )}
    </section>
  );
}
