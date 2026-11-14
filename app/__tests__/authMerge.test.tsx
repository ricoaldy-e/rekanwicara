import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { createSupabaseAuth, type AuthSession } from '../src/auth/session';
import { getClient as accountClient } from '../src/auth/supabase';
import { getClient as syncClient } from '../src/data/supabase';

const mockGetSession = jest.fn();
const mockEnsureProfile = jest.fn().mockResolvedValue(undefined);
let mockListener: (session: AuthSession | null) => void;
const mockStop = jest.fn();
const A = { uid: '11111111-1111-4111-8111-111111111111', email: 'a@example.test', displayName: 'A' };
const B = { uid: '22222222-2222-4222-8222-222222222222', email: 'b@example.test', displayName: 'B' };

jest.mock('../src/auth/session', () => ({
  ...jest.requireActual('../src/auth/session'),
  auth: {
    getSession: () => mockGetSession(),
    ensureProfile: (...args: unknown[]) => mockEnsureProfile(...args),
    onAuthStateChange: (listener: typeof mockListener) => { mockListener = listener; return mockStop; },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(A);
});

function Probe() {
  const { ready, uid } = useAuth();
  const [open, setOpen] = useState(false);
  return <Text testID="auth-state" onPress={() => setOpen(true)}>{`${ready}:${uid}:${open}`}</Text>;
}

it('shares the exact Supabase client factory between account screens and queue operations', () => {
  expect(accountClient).toBe(syncClient);
});

it('does not let a stale restore overwrite a newer auth event', async () => {
  let finish!: (session: AuthSession | null) => void;
  mockGetSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await render(<AuthProvider required><Probe /></AuthProvider>);
  await act(async () => mockListener(B));
  await act(async () => finish(A));
  expect(screen.getByTestId('auth-state')).toHaveTextContent(`true:${B.uid}:false`);
  expect(mockEnsureProfile).not.toHaveBeenCalledWith(A);
});

it('clears unlocked child state on account change and logout, but preserves it on refresh', async () => {
  const view = await render(<AuthProvider required><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent(`true:${A.uid}:false`));
  await fireEvent.press(screen.getByTestId('auth-state'));
  await act(async () => mockListener({ ...A }));
  expect(screen.getByTestId('auth-state')).toHaveTextContent(`true:${A.uid}:true`);
  await act(async () => mockListener(B));
  expect(screen.getByTestId('auth-state')).toHaveTextContent(`true:${B.uid}:false`);
  await fireEvent.press(screen.getByTestId('auth-state'));
  await act(async () => mockListener(null));
  expect(screen.getByTestId('auth-state')).toHaveTextContent('true:local:false');
  await view.unmount();
  expect(mockStop).toHaveBeenCalledTimes(1);
});

it('creates missing profile metadata without overwriting an existing display name', async () => {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn(() => ({ upsert }));
  const getUser = jest.fn().mockResolvedValue({ data: { user: { id: A.uid, email: A.email, is_anonymous: false } }, error: null });
  const auth = createSupabaseAuth(() => ({ auth: { getUser }, from }) as unknown as SupabaseClient);
  await auth.ensureProfile(A);
  expect(upsert).toHaveBeenCalledWith({ user_id: A.uid, display_name: 'A' }, { onConflict: 'user_id', ignoreDuplicates: true });
  await auth.ensureProfile(B);
  expect(upsert).toHaveBeenCalledTimes(1);
});

it('rejects anonymous sessions during restoration, token reads and auth events', async () => {
  let listener!: (event: string, session: unknown) => void;
  const session = { user: { id: A.uid, email: A.email, is_anonymous: true }, access_token: 'fixture-token' };
  const auth = createSupabaseAuth(() => ({ auth: {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: (next: typeof listener) => { listener = next; return { data: { subscription: { unsubscribe: jest.fn() } } }; },
  } }) as unknown as SupabaseClient);
  expect(await auth.getSession()).toBeNull();
  expect(await auth.getAccessToken()).toBeNull();
  const changed = jest.fn();
  auth.onAuthStateChange(changed);
  listener('SIGNED_IN', session);
  expect(changed).toHaveBeenCalledWith(null);
});

it('logs out only the current device and reports SDK failures', async () => {
  const signOut = jest.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('fixture-error') });
  const auth = createSupabaseAuth(() => ({ auth: { signOut } }) as unknown as SupabaseClient);
  await auth.signOut();
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  await expect(auth.signOut()).rejects.toMatchObject({ code: 'SERVER' });
});

it('refuses a second credential mutation until the first finishes', async () => {
  let finish!: (result: unknown) => void;
  const signInWithPassword = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  const signOut = jest.fn();
  const auth = createSupabaseAuth(() => ({ auth: { signInWithPassword, signOut } }) as unknown as SupabaseClient);
  const pending = auth.signIn({ email: A.email, password: 'fixture-password' });
  await expect(auth.signOut()).rejects.toThrow(/Tunggu/);
  expect(signOut).not.toHaveBeenCalled();
  finish({ data: { session: { user: { id: A.uid, email: A.email } } }, error: null });
  expect(await pending).toMatchObject({ uid: A.uid });
});
