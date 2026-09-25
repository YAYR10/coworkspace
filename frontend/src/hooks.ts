import { useCallback, useEffect, useState } from 'react';
import { ApiError, getSession, onSessionChange, Session } from './api';

export function useSession(): Session | null {
  const [s, setS] = useState(getSession());
  useEffect(() => {
    const off = onSessionChange(setS);
    return () => {
      off();
    };
  }, []);
  return s;
}

/** Carga datos y expone { data, error, loading, reload }. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Algo falló al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

export const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Algo falló. Intenta de nuevo.');
