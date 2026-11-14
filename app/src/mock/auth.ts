/** Mock accounts (EXPO_PUBLIC_USE_MOCK): same shape as src/auth/session.ts. The password is never stored. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthFailure } from '../auth/errors';
import type { AuthApi, AuthSession } from '../auth/session';

const KEY = 'rw.mock.session';
export const MOCK_UID = 'mock-user';

const listeners = new Set<(s: AuthSession | null) => void>();
const emit = (s: AuthSession | null) => listeners.forEach((l) => l(s));

async function save(session: AuthSession | null) {
  try {
    if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // the mock then forgets the session when the app closes
  }
  emit(session);
}

async function read(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export const mockAuth: AuthApi = {
  async signUp({ nickname, email }) {
    if (email === 'dipakai@contoh.id') throw new AuthFailure('EMAIL_TAKEN');
    if (email === 'mati@contoh.id') throw new AuthFailure('NETWORK');
    if (email === 'cek@contoh.id') return null; // email confirmation is on: no session yet
    const session = { uid: MOCK_UID, email, displayName: nickname };
    await save(session);
    return session;
  },
  async signIn({ email }) {
    if (email === 'salah@contoh.id') throw new AuthFailure('INVALID_CREDENTIALS');
    if (email === 'mati@contoh.id') throw new AuthFailure('NETWORK');
    const session = { uid: MOCK_UID, email, displayName: null };
    await save(session);
    return session;
  },
  async signOut() {
    await save(null);
  },
  getSession: read,
  onAuthStateChange(listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  async getAccessToken() {
    return (await read()) ? 'mock-token' : null;
  },
  async refreshAccessToken() {
    return (await read()) ? 'mock-token' : null;
  },
  async ensureProfile() {},
};
