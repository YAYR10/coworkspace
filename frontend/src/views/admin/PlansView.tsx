import { FormEvent, useState } from 'react';
import { api, Plan, ResourceType } from '../../api';
import { Loading, Notice, PageHead } from '../../components/ui';
import { money } from '../../format';
import { errorText, useLoad } from '../../hooks';

const ACCESS: Record<ResourceType, string> = { ROOM: 'Salas de reunión', DESK: 'Puestos de trabajo' };
type PlanBody = { name: string; price: number; description: string; resourceAccess: ResourceType[] };

/** Solo administrador: editar precios y crear planes. */
export function PlansView() {
  const plans = useLoad(() => api.get<Plan[]>('/api/plans'));
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const save = async (id: string, body: PlanBody) => {
    try {
      await api.patch(`/api/plans/${id}`, body);
      setEditing(null);
      setMsg({ tone: 'ok', text: `Plan ${body.name} actualizado. Aplica a las próximas renovaciones.` });
      await plans.reload();
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    }
  };
  const create = async (body: PlanBody & { code: string }) => {
    try {
      await api.post('/api/plans', body);
      setCreating(false);
      setMsg({ tone: 'ok', text: `Plan ${body.name} creado.` });
      await plans.reload();
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    }
  };

  return (
    <>
      <PageHead title="Planes">Precios mensuales y qué espacios incluye cada plan. Lo que un plan no incluye se cobra por hora.</PageHead>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {plans.loading && <Loading />}
      {plans.data && (
        <ul className="rows">
          {plans.data.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="row row-form">
                <PlanForm initial={p} submitLabel="Guardar" onCancel={() => setEditing(null)} onSubmit={(b) => save(p.id, b)} />
              </li>
            ) : (
              <li key={p.id} className="row">
                <div className="row-main">
                  <p className="row-title">{p.name}</p>
                  <p className="row-sub">{p.resourceAccess.map((r) => ACCESS[r]).join(' y ')}{p.description ? `. ${p.description}` : ''}</p>
                </div>
                <span className="price">{money(p.price)}</span>
                <button className="btn btn-quiet" onClick={() => setEditing(p.id)}>Editar</button>
              </li>
            ),
          )}
        </ul>
      )}
      {creating ? (
        <section className="block">
          <h2>Nuevo plan</h2>
          <PlanForm withCode submitLabel="Crear plan" onCancel={() => setCreating(false)} onSubmit={(b) => create(b as PlanBody & { code: string })} />
        </section>
      ) : (
        <button className="btn btn-ghost btn-start" onClick={() => setCreating(true)}>Nuevo plan</button>
      )}
    </>
  );
}

function PlanForm({
  initial,
  withCode,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Plan;
  withCode?: boolean;
  submitLabel: string;
  onSubmit: (b: PlanBody & { code?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState(initial?.price ?? 300000);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [access, setAccess] = useState<ResourceType[]>(initial?.resourceAccess ?? ['DESK']);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (access.length === 0) return;
    setBusy(true);
    await onSubmit({ name: name.trim(), price, description: description.trim(), resourceAccess: access, ...(withCode ? { code } : {}) });
    setBusy(false);
  };
  const toggle = (r: ResourceType) => setAccess(access.includes(r) ? access.filter((x) => x !== r) : [...access, r]);

  return (
    <form className="form" onSubmit={submit}>
      <div className="field-row">
        <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="field"><span>Precio mensual (COP)</span><input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} required /></label>
      </div>
      {withCode && (
        <label className="field">
          <span>Código</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z_]/g, '_'))} required placeholder="PLAN_ESTUDIANTE" />
          <small>En mayúsculas y con guiones bajos. No se puede cambiar después.</small>
        </label>
      )}
      <label className="field"><span>Descripción</span><input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <fieldset className="checks">
        <legend>Incluye</legend>
        {(Object.keys(ACCESS) as ResourceType[]).map((r) => (
          <label key={r} className="check">
            <input type="checkbox" checked={access.includes(r)} onChange={() => toggle(r)} />
            {ACCESS[r]}
          </label>
        ))}
      </fieldset>
      {access.length === 0 && <Notice tone="error">Un plan debe incluir al menos un tipo de espacio.</Notice>}
      <div className="form-actions form-actions-start">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" disabled={busy || access.length === 0}>{busy ? 'Guardando…' : submitLabel}</button>
      </div>
    </form>
  );
}
