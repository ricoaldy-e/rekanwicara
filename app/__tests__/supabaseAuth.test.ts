import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { createRemote, getClient } from '../src/data/supabase';

const UID = '11111111-1111-4111-8111-111111111111';
const mockAuth = {
  getUser: jest.fn(), signInAnonymously: jest.fn(),
  startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn(),
};
const mockUpsert = jest.fn();
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));
const mockCreate = jest.fn((..._args: unknown[]) => ({ auth: mockAuth, from: mockFrom }));
const mockLock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreate(...args),
  processLock: (...args: unknown[]) => mockLock(...args),
}));
jest.mock('../src/config', () => ({
  SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'fixture-public-key',
}));

beforeEach(() => {
  mockAuth.getUser.mockReset().mockResolvedValue({ data: { user: { id: UID, email: 'companion@example.test', is_anonymous: false } }, error: null });
  mockAuth.signInAnonymously.mockClear();
  mockUpsert.mockReset().mockResolvedValue({ error: null });
  mockFrom.mockClear();
});

it('uses one persisted client, process locking and foreground-only refresh', () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  expect(getClient()).toBe(getClient());
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate.mock.calls[0][2]).toMatchObject({
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: expect.any(Function) },
  });
  const callback = listener.mock.calls.find(([event]) => event === 'change')![1];
  callback('active');
  expect(mockAuth.startAutoRefresh).toHaveBeenCalled();
  callback('background');
  expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
  listener.mockRestore();
});

it.each([
  { data: { user: null }, error: null },
  { data: { user: { id: UID, is_anonymous: true } }, error: null },
  { data: { user: null }, error: { name: 'AuthRetryableFetchError' } },
])('never automatically signs in anonymously when login is unavailable', async (response) => {
  mockAuth.getUser.mockResolvedValue(response);
  await expect(createRemote()!.ensureUser()).rejects.toThrow();
  expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
});

it('rejects another owner before upsert and preserves display names on sync profile creation', async () => {
  const remote = createRemote()!;
  await expect(remote.upsert('attempts', [{ user_id: 'another-account' }])).rejects.toThrow(/Akun berubah/);
  expect(mockFrom).not.toHaveBeenCalled();
  await remote.upsert('profiles', [{ user_id: UID }]);
  expect(mockUpsert).toHaveBeenCalledWith([{ user_id: UID }], { onConflict: 'user_id', ignoreDuplicates: true });
});
