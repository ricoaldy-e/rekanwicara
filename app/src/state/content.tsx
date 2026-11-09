import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { HealthResponse, Item } from '../api/types';
import { useSettings } from './settings';

interface ContentValue {
  health: HealthResponse | null;
  items: Item[] | null;
  loading: boolean;
  /** Error from /v1/items (the list is what the app needs to work). */
  error: unknown;
  /** Error from /v1/health, shown separately. */
  healthError: unknown;
  reload(): void;
}

const ContentContext = createContext<ContentValue | null>(null);

/** Server health + item list, shared by home and practice. Reloads when the server URL changes. */
export function ContentProvider({ children }: { children: ReactNode }) {
  const { api, ready } = useSettings();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [healthError, setHealthError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([api.getHealth(), api.getItems()]).then(([h, it]) => {
      if (cancelled) return;
      if (h.status === 'fulfilled') {
        setHealth(h.value);
        setHealthError(null);
      } else {
        setHealth(null);
        setHealthError(h.reason);
      }
      if (it.status === 'fulfilled') {
        setItems(it.value);
        setError(null);
      } else {
        setError(it.reason);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [api, ready, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return (
    <ContentContext.Provider value={{ health, items, loading, error, healthError, reload }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside <ContentProvider>');
  return ctx;
}
