import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { getClient } from '../data/supabase';
import { withAuthChange } from '../auth/supabase';
import { writeResume } from '../home/resume';
import { isValidPin, newProfile, parseProfile, type Profile } from './pure';

export const PROFILE_KEY = 'cw.profile';
export const PIN_KEY = 'cw.companionPin';
const GUEST_PROFILE_KEY = `${PROFILE_KEY}.guest`;

function accountKey(prefix: string, uid: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
    throw new Error('ID akun tidak valid.');
  }
  return `${prefix}.${uid}`;
}

async function pinAccount(expectedUid?: string): Promise<string> {
  const { data, error } = await getClient().auth.getSession();
  const user = data.session?.user;
  if (error || !user || user.is_anonymous || !user.email) throw new Error('Login akun pendamping diperlukan.');
  if (expectedUid !== undefined && expectedUid !== user.id) throw new Error('Akun berubah; operasi PIN dibatalkan.');
  return user.id;
}

/** Storage can be unavailable (private mode, cleared data): fall back to a fresh profile. */
export async function loadProfile(uid: string | null = null): Promise<Profile> {
  const key = uid === null ? GUEST_PROFILE_KEY : accountKey(PROFILE_KEY, uid);
  try {
    const profile = parseProfile(await AsyncStorage.getItem(key));
    if (uid !== null && profile.userId !== uid) return newProfile(uid);
    return profile;
  } catch {
    return uid === null ? newProfile() : newProfile(uid);
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    const key = profile.userId.startsWith('u_') ? GUEST_PROFILE_KEY : accountKey(PROFILE_KEY, profile.userId);
    await AsyncStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // The session keeps working from memory; progress is lost only if the app closes.
  }
}

let writingPin = false;
let resetAuthorization: { uid: string; token: string } | null = null;

/** A reset grant stays in memory and is bound to the fresh password session, never a route parameter. */
export async function authorizePinReset(password: string, expectedUid: string): Promise<void> {
  return withAuthChange(async () => {
    resetAuthorization = null;
    const uid = await pinAccount(expectedUid);
    const { data: before, error } = await getClient().auth.getUser();
    if (error || before.user?.id !== uid || !before.user.email || before.user.is_anonymous || !password) {
      throw new Error('Verifikasi akun pendamping diperlukan.');
    }
    const result = await getClient().auth.signInWithPassword({ email: before.user.email, password });
    if (result.error) throw result.error;
    const session = result.data.session;
    if (!session || session.user.id !== uid || session.user.is_anonymous || !session.access_token) {
      throw new Error('Akun berubah; pembuatan ulang PIN dibatalkan.');
    }
    if (await pinAccount(expectedUid) !== uid) throw new Error('Akun berubah; pembuatan ulang PIN dibatalkan.');
    resetAuthorization = { uid, token: session.access_token };
  });
}

async function writePin(currentPin: string | null, pin: string, expectedUid?: string, reset = false): Promise<void> {
  if (!isValidPin(pin) || (currentPin !== null && !isValidPin(currentPin))) throw new Error('PIN harus 4 angka.');
  if (writingPin) throw new Error('Tunggu perubahan PIN yang sedang berjalan.');
  writingPin = true;
  try {
    const uid = await pinAccount(expectedUid);
    const key = accountKey(PIN_KEY, uid);
    const previous = await SecureStore.getItemAsync(key);
    if (reset) {
      const { data, error } = await getClient().auth.getSession();
      if (error || !resetAuthorization || resetAuthorization.uid !== uid ||
          resetAuthorization.token !== data.session?.access_token) throw new Error('Verifikasi password diperlukan untuk membuat ulang PIN.');
      resetAuthorization = null;
    } else if (currentPin === null && previous !== null) throw new Error('PIN sudah dibuat. Gunakan perubahan PIN.');
    if (currentPin !== null && previous !== currentPin) throw new Error('PIN saat ini salah.');
    if (await pinAccount() !== uid) throw new Error('Akun berubah; perubahan PIN dibatalkan.');
    await SecureStore.setItemAsync(key, pin);
  } finally {
    writingPin = false;
  }
}

/** The companion PIN lives in the device keystore, never in AsyncStorage. */
export async function savePin(pin: string, expectedUid?: string): Promise<void> {
  return writePin(null, pin, expectedUid);
}

export async function verifyPin(pin: string, expectedUid?: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const uid = await pinAccount(expectedUid);
  const saved = await SecureStore.getItemAsync(accountKey(PIN_KEY, uid));
  return await pinAccount() === uid && saved === pin;
}

export async function hasPin(expectedUid?: string): Promise<boolean> {
  const uid = await pinAccount(expectedUid);
  const saved = await SecureStore.getItemAsync(accountKey(PIN_KEY, uid));
  if (await pinAccount() !== uid) throw new Error('Akun berubah; pemeriksaan PIN dibatalkan.');
  return saved !== null;
}

export async function changePin(currentPin: string, nextPin: string, expectedUid?: string): Promise<void> {
  return writePin(currentPin, nextPin, expectedUid);
}

/** Existing PIN replacement requires a one-use password grant for this exact account/session. */
export async function resetPin(pin: string, expectedUid: string): Promise<void> {
  return writePin(null, pin, expectedUid, true);
}

/** Only called after the owner explicitly deletes the Auth account successfully. Legacy data stays. */
export async function removeAccountData(uid: string): Promise<void> {
  await SecureStore.deleteItemAsync(accountKey(PIN_KEY, uid));
  await AsyncStorage.removeItem(accountKey(PROFILE_KEY, uid));
  await writeResume(uid, null);
}
