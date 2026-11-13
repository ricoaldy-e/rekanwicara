import { act, render, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';

import { UserProvider, useUser } from '../src/state/user';
import { newProfile, type Profile } from '../src/user/pure';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let mockUid: string | null = A;
let mockListener: (session: Session | null) => void;
const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockEnsure = jest.fn();
const mockUpsert = jest.fn();
const mockStop = jest.fn();
const mockSavePin = jest.fn();
const mockVerifyPin = jest.fn();
const mockItems: never[] = [];
let latest: ReturnType<typeof useUser>;

const session = (uid: string): Session => ({ user: { id: uid } } as Session);
const pending = (uid: string): Profile => ({
  ...newProfile(uid),
  listenChecks: [{ id: 'fixture-check', itemId: 'l1_a', at: '2026-11-13T00:00:00Z', result: 'jelas', synced: false }],
});

jest.mock('../src/auth/companion', () => ({
  onCompanionAuthChange: (listener: (value: Session | null) => void) => {
    mockListener = listener;
    listener(mockUid ? { user: { id: mockUid } } as Session : null);
    return mockStop;
  },
}));
jest.mock('../src/state/content', () => ({ useContent: () => ({ items: mockItems }) }));
jest.mock('../src/data/supabase', () => ({ createRemote: () => ({
  ensureUser: () => mockEnsure(), upsert: (...args: unknown[]) => mockUpsert(...args),
}) }));
jest.mock('../src/user/storage', () => ({
  loadProfile: (uid: string | null) => mockLoad(uid),
  saveProfile: (profile: Profile) => mockSave(profile),
  savePin: (pin: string) => mockSavePin(pin),
  verifyPin: (pin: string) => mockVerifyPin(pin),
}));

function Capture() {
  latest = useUser();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUid = A;
  mockVerifyPin.mockResolvedValue(false);
  mockLoad.mockImplementation(async (uid: string | null) => newProfile(uid ?? undefined));
  mockEnsure.mockImplementation(async () => mockUid);
  mockUpsert.mockImplementation(async (_table: string, rows: { user_id: string }[]) => {
    if (rows.some((row) => row.user_id !== mockUid)) throw new Error('Akun berubah');
  });
});

it('restores only the logged-in account and switches to isolated signed-out state on logout', async () => {
  const view = await render(<UserProvider><Capture /></UserProvider>);
  await waitFor(() => expect(latest.ready).toBe(true));
  expect(mockLoad).toHaveBeenCalledWith(A);
  expect(latest.profile.userId).toBe(A);
  await act(async () => {
    mockUid = null;
    mockListener(null);
  });
  await waitFor(() => expect(latest.ready).toBe(true));
  expect(mockLoad).toHaveBeenLastCalledWith(null);
  expect(latest.session).toBeNull();
  expect(latest.profile.userId).not.toBe(A);
  expect(latest.sync.configured).toBe(false);
  await view.unmount();
  expect(mockStop).toHaveBeenCalledTimes(1);
});

it('ignores a previous account profile load that finishes after switching accounts', async () => {
  let finish!: (profile: Profile) => void;
  mockLoad.mockImplementationOnce(() => new Promise<Profile>((resolve) => { finish = resolve; }));
  await render(<UserProvider><Capture /></UserProvider>);
  await act(async () => {
    mockUid = B;
    mockListener(session(B));
  });
  await waitFor(() => expect(latest.profile.userId).toBe(B));
  await act(async () => finish(pending(A)));
  expect(latest.profile.userId).toBe(B);
  expect(latest.profile.listenChecks).toHaveLength(0);
});

it('ignores stale action callbacks and sync completion belonging to a previous account', async () => {
  let finish!: (uid: string) => void;
  mockLoad.mockImplementationOnce(async () => pending(A));
  mockEnsure.mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }));
  await render(<UserProvider><Capture /></UserProvider>);
  await waitFor(() => expect(mockEnsure).toHaveBeenCalled());
  const oldAddCheck = latest.addListenCheck;
  await act(async () => {
    mockUid = B;
    mockListener(session(B));
  });
  await waitFor(() => expect(latest.ready && latest.profile.userId === B).toBe(true));
  mockSave.mockClear();
  await act(async () => {
    oldAddCheck('l1_a', 'jelas');
    finish(A);
  });
  expect(latest.profile.userId).toBe(B);
  expect(latest.profile.listenChecks).toHaveLength(0);
  expect(mockSave).not.toHaveBeenCalled();
});

it('preserves current state and demo on a token refresh for the same account', async () => {
  await render(<UserProvider><Capture /></UserProvider>);
  await waitFor(() => expect(latest.ready).toBe(true));
  await act(async () => latest.setDemo(true));
  const demoId = latest.profile.userId;
  const loads = mockLoad.mock.calls.length;
  await act(async () => mockListener(session(A)));
  expect(latest.demo).toBe(true);
  expect(latest.profile.userId).toBe(demoId);
  expect(mockLoad).toHaveBeenCalledTimes(loads);
  await act(async () => {
    mockUid = B;
    mockListener(session(B));
  });
  await waitFor(() => expect(latest.profile.userId).toBe(B));
  expect(latest.demo).toBe(false);
});

it('drops a child PIN-unlocked state on account changes but keeps it during same-account refresh', async () => {
  let unlocked = false;
  let unlock!: () => void;
  function Gate() {
    const [value, setValue] = useState(false);
    unlocked = value;
    unlock = () => setValue(true);
    return null;
  }
  await render(<UserProvider><Capture /><Gate /></UserProvider>);
  await waitFor(() => expect(latest.ready).toBe(true));
  await act(async () => unlock());
  expect(unlocked).toBe(true);
  await act(async () => mockListener(session(A)));
  expect(unlocked).toBe(true);
  await act(async () => {
    mockUid = B;
    mockListener(session(B));
  });
  await waitFor(() => expect(latest.profile.userId).toBe(B));
  expect(unlocked).toBe(false);
});

it('can finish onboarding with the verified existing account PIN without overwriting it', async () => {
  mockVerifyPin.mockResolvedValueOnce(true);
  await render(<UserProvider><Capture /></UserProvider>);
  await waitFor(() => expect(latest.ready).toBe(true));
  await act(async () => latest.completeOnboarding('1234'));
  expect(latest.profile.onboarded).toBe(true);
  expect(mockSavePin).not.toHaveBeenCalled();
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ userId: A, onboarded: true }));
});
