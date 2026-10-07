import { useRef, useState } from 'react';
import { api, Location } from '../api';
import { errorText } from '../hooks';
import { Notice } from './ui';

/** Reduce la foto en el navegador (máx. 1400 px, JPEG) para que pese poco antes de subirla. */
function resize(file: File, max = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

export function PhotoField({ location, onChanged }: { location: Location; onChanged: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o WebP).');
      const dataUrl = await resize(file);
      await api.put(`/api/locations/${location.id}/photo`, { dataUrl });
      onChanged('Foto actualizada.');
    } catch (e) {
      setError(e instanceof Error && !('status' in e) ? e.message : errorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Quitar la foto de la sede?')) return;
    try {
      await api.del(`/api/locations/${location.id}/photo`);
      onChanged('Foto eliminada.');
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="photo-field">
      {location.photoUrl ? (
        <img className="photo-preview" src={location.photoUrl} alt={`Foto de ${location.name}`} />
      ) : (
        <div className="photo-empty">Sin foto. Una foto ayuda a que los miembros reconozcan la sede.</div>
      )}
      <div className="form-actions form-actions-start">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0])} />
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Subiendo…' : location.photoUrl ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {location.photoUrl && (
          <button type="button" className="btn btn-quiet" onClick={() => void remove()}>
            Quitar foto
          </button>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
