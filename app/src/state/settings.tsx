import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { createApiClient, normalizeBaseUrl, type ApiClient } from '../api/client';
import { ENV_API_URL } from '../config';

/** Key of the removed in-app server address override; cleared once so an old value cannot linger. */
export const API_URL_STORAGE_KEY = 'cw.apiUrlOverride';

interface SettingsValue {
  /** The server address from app/.env (EXPO_PUBLIC_API_URL). */
  apiUrl: string;
  /** Always true: kept so consumers that waited for a stored override still work. */
  ready: boolean;
  api: ApiClient;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.removeItem(API_URL_STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const apiUrl = normalizeBaseUrl(ENV_API_URL);
    return { apiUrl, ready: true, api: createApiClient(apiUrl) };
  }, []);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
