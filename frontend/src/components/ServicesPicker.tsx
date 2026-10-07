import { useState } from 'react';
import { SERVICE_CATALOG } from '../format';

/** Selección de servicios de una sede: catálogo sugerido + servicios propios. */
export function ServicesPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const toggle = (s: string) => onChange(has(s) ? value.filter((v) => v.toLowerCase() !== s.toLowerCase()) : [...value, s]);
  const extras = value.filter((v) => !SERVICE_CATALOG.some((c) => c.toLowerCase() === v.toLowerCase()));

  const add = () => {
    const s = custom.trim();
    if (s.length >= 2 && !has(s)) onChange([...value, s]);
    setCustom('');
  };

  return (
    <fieldset className="services-picker">
      <legend>Servicios de la sede</legend>
      <div className="chips">
        {[...SERVICE_CATALOG, ...extras].map((s) => (
          <button type="button" key={s} className={`chip chip-toggle${has(s) ? ' is-on' : ''}`} aria-pressed={has(s)} onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="services-add">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Otro servicio, por ejemplo: Gimnasio"
          maxLength={40}
          aria-label="Agregar otro servicio"
        />
        <button type="button" className="btn btn-ghost" onClick={add} disabled={custom.trim().length < 2}>Agregar</button>
      </div>
    </fieldset>
  );
}
