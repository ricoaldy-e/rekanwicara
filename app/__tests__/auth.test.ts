import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  changePassword, createCompanionProfile, deleteCompanionAccount, getCompanionSession,
  loginCompanion, logoutCompanion, onCompanionAuthChange, readCompanionProfile,
  registerCompanion, requestPasswordChangeVerification, requestPasswordReset,
  updateCompanionProfile, verifyPasswordRecovery,
} from '../src/auth/companion';
import { newProfile } from '../src/user/pure';
import { readResume, writeResume } from '../src/home/resume';
import {
  changePin, hasPin, loadProfile, PIN_KEY, PROFILE_KEY, savePin, saveProfile, verifyPin,
} from '../src/user/storage';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const mockAuth = {
  getSession: jest.fn(), getUser: jest.fn(), signUp: jest.fn(), signInWithPassword: jest.fn(),
  signOut: jest.fn(), resetPasswordForEmail: jest.fn(), updateUser: jest.fn(),
  verifyOtp: jest.fn(), reauthenticate: jest.fn(), onAuthStateChange: jest.fn(),
};
const mockQuery = {
  select: jest.fn(), eq: jest.fn(), insert: jest.fn(), update: jest.fn(),
  maybeSingle: jest.fn(), single: jest.fn(), upsert: jest.fn(),
};
const mockFrom = jest.fn((_table: string) => mockQuery);
const mockDeleteAccount = jest.fn();
let mockListener: (event: string, session: unknown) => void;
const mockUnsubscribe = jest.fn();
let mockSession: { user: { id: string; email: string; is_anonymous: boolean }; access_token: string } | null;
const mockSecure = new Map<string, string>();

jest.mock('../src/data/supabase', () => ({
  isSupabaseConfigured: true,
  getClient: () => ({ auth: mockAuth, from: mockFrom }),
}));
jest.mock('../src/api/client', () => ({
  createApiClient: () => ({ deleteAccount: mockDeleteAccount }),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecure.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecure.delete(key); }),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockSecure.clear();
  mockSession = { user: { id: UID, email: 'companion@example.test', is_anonymous: false }, access_token: 'fixture-access-token' };
  mockAuth.getSession.mockImplementation(async () => ({ data: { session: mockSession }, error: null }));
  mockAuth.getUser.mockImplementation(async () => ({ data: { user: mockSession?.user ?? null }, error: null }));
  mockAuth.signInWithPassword.mockImplementation(async () => ({ data: { session: mockSession }, error: null }));
  mockAuth.signUp.mockResolvedValue({ data: { session: null, user: { id: UID } }, error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mockAuth.updateUser.mockResolvedValue({ data: { user: mockSession.user }, error: null });
  mockAuth.verifyOtp.mockResolvedValue({ data: { session: mockSession }, error: null });
  mockAuth.reauthenticate.mockResolvedValue({ error: null });
  mockAuth.onAuthStateChange.mockImplementation((listener) => {
    mockListener = listener;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
  for (const method of ['select', 'eq', 'insert', 'update'] as const) mockQuery[method].mockReturnValue(mockQuery);
  const row = { user_id: UID, display_name: 'Pendamping', created_at: '2026-11-13T00:00:00Z' };
  mockQuery.maybeSingle.mockResolvedValue({ data: row, error: null });
  mockQuery.single.mockResolvedValue({ data: row, error: null });
  mockQuery.upsert.mockResolvedValue({ error: null });
  mockDeleteAccount.mockResolvedValue({ status: 'deleted' });
});

it('registers with email/password and waits for email confirmation without inventing a session', async () => {
  const result = await registerCompanion(' companion@example.test ', 'valid-password', ' Steven ');
  expect(mockAuth.signUp).toHaveBeenCalledWith({
    email: 'companion@example.test', password: 'valid-password', options: { data: { display_name: 'Steven' } },
  });
  expect(result.session).toBeNull();
  expect(mockFrom).not.toHaveBeenCalled();
});

it('logs in, restores sessions, observes logout and unsubscribes', async () => {
  expect(await loginCompanion('companion@example.test', 'valid-password')).toBe(mockSession);
  expect(await getCompanionSession()).toBe(mockSession);
  const listener = jest.fn();
  const stop = onCompanionAuthChange(listener);
  mockListener('INITIAL_SESSION', mockSession);
  expect(listener).toHaveBeenLastCalledWith(mockSession, 'INITIAL_SESSION');
  mockListener('SIGNED_OUT', null);
  expect(listener).toHaveBeenLastCalledWith(null, 'SIGNED_OUT');
  stop();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  await logoutCompanion();
  expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('creates the confirmed account profile from registration metadata without overwriting existing profiles', async () => {
  const user = { ...mockSession!.user, user_metadata: { display_name: 'Steven' } };
  mockAuth.signInWithPassword.mockResolvedValueOnce({ data: { session: { ...mockSession, user } }, error: null });
  await loginCompanion('companion@example.test', 'valid-password');
  expect(mockQuery.upsert).toHaveBeenCalledWith({ user_id: UID, display_name: 'Steven' }, { onConflict: 'user_id', ignoreDuplicates: true });
});

it('creates a profile immediately if signup returns an authenticated session', async () => {
  const user = { ...mockSession!.user, user_metadata: { display_name: 'Steven' } };
  mockAuth.signUp.mockResolvedValueOnce({ data: { user, session: { ...mockSession, user } }, error: null });
  await registerCompanion('companion@example.test', 'valid-password', 'Steven');
  expect(mockQuery.upsert).toHaveBeenCalledWith({ user_id: UID, display_name: 'Steven' }, { onConflict: 'user_id', ignoreDuplicates: true });
});

it('keeps the profile retry explicit when login succeeds but the profile write fails', async () => {
  mockQuery.upsert.mockResolvedValueOnce({ error: new Error('Network unavailable') });
  await expect(loginCompanion('companion@example.test', 'valid-password')).rejects.toThrow(/Login berhasil, tetapi profil/);
});

it('keeps legacy anonymous sessions out of companion state without deleting them', async () => {
  mockSession!.user.is_anonymous = true;
  expect(await getCompanionSession()).toBeNull();
  const listener = jest.fn();
  onCompanionAuthChange(listener);
  mockListener('SIGNED_IN', mockSession);
  expect(listener).toHaveBeenCalledWith(null, 'SIGNED_IN');
  await expect(readCompanionProfile()).rejects.toThrow(/login/i);
  expect(mockAuth.signOut).not.toHaveBeenCalled();
});

it('sends password recovery, verifies the recovery token and forwards the secure-change nonce', async () => {
  await requestPasswordReset('companion@example.test', 'cerminwicara://auth/callback');
  expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('companion@example.test', { redirectTo: 'cerminwicara://auth/callback' });
  await verifyPasswordRecovery('fixture-token-hash');
  expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'fixture-token-hash', type: 'recovery' });
  await requestPasswordChangeVerification();
  expect(mockAuth.reauthenticate).toHaveBeenCalledTimes(1);
  await changePassword('new-valid-password', 'fixture-nonce');
  expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'new-valid-password', nonce: 'fixture-nonce' });
});

it('reads, creates and updates only the current owner profile using existing columns', async () => {
  await readCompanionProfile();
  expect(mockQuery.eq).toHaveBeenCalledWith('user_id', UID);
  await createCompanionProfile(' Pendamping ');
  expect(mockQuery.insert).toHaveBeenCalledWith({ user_id: UID, display_name: 'Pendamping' });
  await updateCompanionProfile(null);
  expect(mockQuery.update).toHaveBeenCalledWith({ display_name: null });
  expect(mockFrom.mock.calls.every(([table]) => table === 'profiles')).toBe(true);
});

it('rejects missing sessions and validation failures before changing credentials or records', async () => {
  await expect(registerCompanion('bad-email', 'pw')).rejects.toThrow(/email/);
  await expect(loginCompanion('companion@example.test', '')).rejects.toThrow(/Password/);
  await expect(createCompanionProfile(' ')).rejects.toThrow(/Nama/);
  mockSession = null;
  await expect(updateCompanionProfile('Pendamping')).rejects.toThrow(/login/i);
  await expect(changePassword('valid-password')).rejects.toThrow(/login/i);
  expect(mockAuth.updateUser).not.toHaveBeenCalled();
  expect(mockQuery.insert).not.toHaveBeenCalled();
});

it('reports auth and database errors without echoing tokens or passwords', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error('fixture-secret') });
  await expect(loginCompanion('companion@example.test', 'fixture-password')).rejects.toThrow('Login gagal. Periksa email dan password.');
  mockQuery.single.mockResolvedValue({ data: null, error: new Error('fixture-secret') });
  await expect(updateCompanionProfile('Pendamping')).rejects.toThrow('Profil belum berhasil diubah.');
});

it('isolates local profiles and preserves the legacy profile and PIN', async () => {
  const legacy = JSON.stringify({ ...newProfile(), onboarded: true });
  await AsyncStorage.setItem(PROFILE_KEY, legacy);
  mockSecure.set(PIN_KEY, '9876');
  const a = { ...newProfile(UID), calibrated: true };
  const b = newProfile(OTHER);
  await saveProfile(a);
  await saveProfile(b);
  expect(await loadProfile(UID)).toEqual(a);
  expect(await loadProfile(OTHER)).toEqual(b);
  expect((await loadProfile()).onboarded).toBe(false);
  expect(await AsyncStorage.getItem(PROFILE_KEY)).toBe(legacy);
  expect(mockSecure.get(PIN_KEY)).toBe('9876');
  await AsyncStorage.setItem(`${PROFILE_KEY}.${UID}`, JSON.stringify(b));
  expect(await loadProfile(UID)).toEqual(newProfile(UID));
});

it('creates, verifies and changes four-digit PINs per account and refuses overwrites', async () => {
  expect(await hasPin()).toBe(false);
  await expect(savePin('123')).rejects.toThrow(/4 angka/);
  await savePin('1234');
  expect(await hasPin()).toBe(true);
  await expect(savePin('9999')).rejects.toThrow(/sudah dibuat/);
  expect(await verifyPin('1234')).toBe(true);
  await expect(changePin('0000', '5678')).rejects.toThrow(/salah/);
  await changePin('1234', '5678');
  expect(await verifyPin('1234')).toBe(false);
  expect(await verifyPin('5678')).toBe(true);
  mockSession!.user.id = OTHER;
  expect(await hasPin()).toBe(false);
  expect(await verifyPin('5678')).toBe(false);
  await savePin('4321');
  expect(mockSecure.get(`${PIN_KEY}.${UID}`)).toBe('5678');
  expect(mockSecure.get(`${PIN_KEY}.${OTHER}`)).toBe('4321');
  mockSession = null;
  await expect(savePin('1234')).rejects.toThrow(/Login/);
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);
});

it('deletes through Auth, then clears only the explicitly deleted account locally', async () => {
  const cursor = { kind: 'word' as const, id: 'fixture-word', position: 1, phase: 'tutorial' as const };
  await writeResume(UID, cursor);
  await writeResume(OTHER, cursor);
  await saveProfile(newProfile(UID));
  await saveProfile(newProfile(OTHER));
  mockSecure.set(`${PIN_KEY}.${UID}`, '1234');
  mockSecure.set(`${PIN_KEY}.${OTHER}`, '5678');
  await deleteCompanionAccount('valid-password', 'https://api.example.test');
  expect(mockDeleteAccount).toHaveBeenCalledWith('fixture-access-token');
  expect(await AsyncStorage.getItem(`${PROFILE_KEY}.${UID}`)).toBeNull();
  expect(await AsyncStorage.getItem(`${PROFILE_KEY}.${OTHER}`)).not.toBeNull();
  expect(mockSecure.has(`${PIN_KEY}.${UID}`)).toBe(false);
  expect(mockSecure.has(`${PIN_KEY}.${OTHER}`)).toBe(true);
  expect(await readResume(UID)).toBeNull();
  expect(await readResume(OTHER)).toEqual(cursor);
});

it('keeps all local data and the session when remote deletion fails', async () => {
  await saveProfile(newProfile(UID));
  mockDeleteAccount.mockRejectedValueOnce(new Error('Delete failed'));
  await expect(deleteCompanionAccount('valid-password', 'https://api.example.test')).rejects.toThrow();
  expect(mockAuth.signOut).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(`${PROFILE_KEY}.${UID}`)).not.toBeNull();
});

it('refuses a second login while a password mutation is in flight', async () => {
  let finish!: (value: { data: { user: unknown }; error: null }) => void;
  mockAuth.updateUser.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const change = changePassword('new-valid-password');
  await Promise.resolve();
  await expect(loginCompanion('other@example.test', 'valid-password')).rejects.toThrow(/Tunggu/);
  finish({ data: { user: mockSession!.user }, error: null });
  await change;
  expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
});

it('never deletes when credential reauthentication returns a different owner', async () => {
  mockAuth.signInWithPassword.mockResolvedValueOnce({
    data: { session: { ...mockSession, user: { ...mockSession!.user, id: OTHER } } }, error: null,
  });
  await expect(deleteCompanionAccount('valid-password', 'https://api.example.test')).rejects.toThrow(/Akun berubah/);
  expect(mockDeleteAccount).not.toHaveBeenCalled();
});

it('never accepts the previous owner PIN if accounts change during SecureStore reading', async () => {
  let finish!: (value: string) => void;
  let started!: () => void;
  const reading = new Promise<void>((resolve) => { started = resolve; });
  jest.mocked(SecureStore.getItemAsync).mockImplementationOnce(() => new Promise((resolve) => {
    finish = resolve;
    started();
  }));
  const checking = verifyPin('1234');
  await reading;
  mockSession!.user.id = OTHER;
  finish('1234');
  expect(await checking).toBe(false);
});

it('refuses overlapping PIN creation instead of allowing an overwrite', async () => {
  let finish!: (value: null) => void;
  jest.mocked(SecureStore.getItemAsync).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const first = savePin('1234');
  await Promise.resolve();
  await expect(savePin('5678')).rejects.toThrow(/Tunggu/);
  finish(null);
  await first;
  expect(mockSecure.get(`${PIN_KEY}.${UID}`)).toBe('1234');
});

it('reports completed deletion accurately even if local session cleanup reports a failure', async () => {
  await saveProfile(newProfile(UID));
  mockAuth.signOut.mockResolvedValueOnce({ error: new Error('Network unavailable') });
  await expect(deleteCompanionAccount('valid-password', 'https://api.example.test')).rejects.toThrow(/Akun sudah dihapus/);
  expect(await AsyncStorage.getItem(`${PROFILE_KEY}.${UID}`)).toBeNull();
});
