import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createApiClient, normalizeBaseUrl, type ApiClient } from '../api/client';
import { ENV_API_URL } from '../config';

export const API_URL_STORAGE_KEY = 'cw.apiUrlOverride';

interface SettingsValue {
  /** URL in use: the saved override, else the value from app/.env. */
  apiUrl: string;
  envApiUrl: string;
  isOverridden: boolean;
  /** False until the saved override has been read from storage. */
  ready: boolean;
  api: ApiClient;
  setApiUrl(url: string): Promise<void>;
  resetApiUrl(): Promise<void>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(API_URL_STORAGE_KEY)
      .then((v) => {
        if (!cancelled && v) setOverride(v);
      })
      .catch(() => undefined) // storage unavailable: fall back to the .env value
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiUrl = useCallback(async (url: string) => {
    const normalized = normalizeBaseUrl(url);
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, normalized);
    setOverride(normalized);
  }, []);

  const resetApiUrl = useCallback(async () => {
    await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
    setOverride(null);
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const apiUrl = normalizeBaseUrl(override ?? ENV_API_URL);
    return {
      apiUrl,
      envApiUrl: normalizeBaseUrl(ENV_API_URL),
      isOverridden: override !== null,
      ready,
      api: createApiClient(apiUrl),
      setApiUrl,
      resetApiUrl,
    };
  }, [override, ready, setApiUrl, resetApiUrl]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
