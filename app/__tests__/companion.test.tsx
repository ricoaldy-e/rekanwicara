import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import type { Item } from '../src/api/types';
import Companion from '../app/(tabs)/companion';
import { addAttempt, makeUuid, newProfile, type Attempt, type Profile } from '../src/user/pure';

const item = (item_id: string, level: number, text: string): Item => ({
  item_id, level, text, units: ['a'], priority: 'required', emoji: null, active: true,
}); // fmt: skip
const mockItems = [item('l1_a', 1, 'a'), item('l1_i', 1, 'i'), item('l3_mama', 3, 'mama')];

const mockLock = jest.fn();
const mockAddListenCheck = jest.fn();
const mockUpdateSettings = jest.fn();
let mockProfile: Profile;
let mockDemo = false;
let mockSync: { configured: boolean; running: boolean; pending: number; lastError: string | null; lastSyncedAt: string | null };

jest.mock('../src/pin/PinSession', () => ({ usePinSession: () => ({ lock: mockLock }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({ items: mockItems }) }));
jest.mock('../src/state/user', () => ({
  useUser: () => ({
    profile: mockProfile,
    demo: mockDemo,
    // The real progression rules, so the screen shows what the app would show.
    progress: jest
      .requireActual<typeof import('../src/state/progression')>('../src/state/progression')
      .buildProgress(mockItems, mockProfile.attempts, mockProfile.listenChecks, { listenCheckRequired: false, unlockAll: false }, new Date()),
    sync: mockSync,
    addListenCheck: mockAddListenCheck,
    updateSettings: mockUpdateSettings,
    syncNow: jest.fn(),
  }),
}));

function attempt(itemId: string, overall: Attempt['overall'], session: string, minutesAgo: number): Attempt {
  return {
    id: makeUuid(), itemId, level: 1, sessionId: session, at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    overall, score: 1, indicators: { bibir: 'hijau', suara: 'hijau' }, hintId: 'ok_good', scorer: 'rules',
    engineVersion: '0.1.0', synced: false,
  }; // fmt: skip
}

beforeEach(() => {
  mockLock.mockReset();
  mockAddListenCheck.mockReset();
  mockUpdateSettings.mockReset();
  mockProfile = newProfile();
  mockDemo = false;
  mockSync = { configured: false, running: false, pending: 0, lastError: null, lastSyncedAt: null };
});

/** The PIN gate is in the tab layout (PinGate); the screen itself opens straight to the summary. */
async function unlock() {
  await render(<Companion />);
}

describe('Mode Pendamping', () => {
  it('no longer asks for a PIN itself and locks the session on "Kunci kembali"', async () => {
    await unlock();
    expect(screen.queryByTestId('companion-pin')).toBeNull();
    expect(screen.getByTestId('weekly-summary')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Kunci kembali' }));
    expect(mockLock).toHaveBeenCalledTimes(1);
  });

  it('opens with the right PIN and shows the weekly summary', async () => {
    mockProfile = [attempt('l1_a', 'hijau', 's1', 10), attempt('l1_a', 'merah', 's1', 5)].reduce(addAttempt, mockProfile);
    await unlock();
    await waitFor(() => expect(screen.getByTestId('weekly-summary')).toBeTruthy());
    expect(screen.getByText('Sesi latihan: 1')).toBeTruthy();
    expect(screen.getByText('Percobaan: 2, 1 sesuai')).toBeTruthy();
    expect(screen.queryByTestId('consult-advice')).toBeNull();
  });

  it('advises talking to a teacher or therapist when a material is stuck', async () => {
    const sessions = ['s1', 's2', 's3'];
    for (const [k, s] of sessions.entries()) {
      for (const o of ['merah', 'merah', 'merah'] as const) mockProfile = addAttempt(mockProfile, attempt('l1_i', o, s, 1000 - k * 100));
    }
    await unlock();
    await waitFor(() => expect(screen.getByTestId('consult-advice')).toBeTruthy());
    expect(screen.getByTestId('consult-advice')).toHaveAccessibleName(/guru atau terapis wicara/);
  });

  it('Uji Dengar records "jelas" or "belum jelas" for the chosen word and shows no result screen', async () => {
    mockProfile = addAttempt(mockProfile, attempt('l1_a', 'hijau', 's1', 3));
    await unlock();
    await waitFor(() => expect(screen.getByTestId('open-listen')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('open-listen'));
    await fireEvent.press(screen.getByTestId('listen-pick-l1_a'));
    await fireEvent.press(screen.getByTestId('listen-clear'));
    expect(mockAddListenCheck).toHaveBeenCalledWith('l1_a', 'jelas');
    expect(screen.getByTestId('listen-saved')).toBeTruthy();
    for (const hidden of ['result-ok', 'result-bibir', 'result-suara']) expect(screen.queryByTestId(hidden)).toBeNull();
  });

  it('the settings change the stored settings', async () => {
    await unlock();
    await waitFor(() => expect(screen.getByTestId('setting-unlock')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('setting-unlock'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ unlockAll: true });
    await fireEvent.press(screen.getByTestId('setting-listen'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ listenCheckRequired: true });
    await fireEvent.press(screen.getByRole('radio', { name: '15 menit' }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ sessionMinutes: 15 });
  });

  it('shares the text report through the share sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await unlock();
    await waitFor(() => expect(screen.getByTestId('share-report')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('share-report'));
    expect(share).toHaveBeenCalledTimes(1);
    const message = String(share.mock.calls[0][0].message);
    expect(message).toContain('Laporan latihan Rekan Wicara');
    expect(message).toContain('bukan penilaian klinis');
    share.mockRestore();
  });

  it('says plainly when online storage is not connected, and shows the queue when it is', async () => {
    await unlock();
    await waitFor(() => expect(screen.getByTestId('sync-off')).toBeTruthy());
    mockSync = { ...mockSync, configured: true, pending: 3, lastError: 'Network request failed' };
    await render(<Companion />);
    await waitFor(() => expect(screen.getAllByTestId('sync-status').length).toBeGreaterThan(0));
    expect(screen.getAllByText('3 catatan menunggu dikirim.').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('sync-error').length).toBeGreaterThan(0);
  });

  it('shows ongoing sync and last success as visible feedback', async () => {
    mockSync = { ...mockSync, configured: true, running: true, lastSyncedAt: '2026-11-11T12:00:00Z' };
    await unlock();
    expect(screen.getByText('Sedang menyinkronkan catatan…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Menyinkronkan…' })).toBeDisabled();
    expect(screen.getByText(/Terakhir disinkronkan:/)).toBeTruthy();
  });

  it('labels demo storage and shared reports as synthetic', async () => {
    mockDemo = true;
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await unlock();
    expect(screen.getByTestId('sync-demo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sinkronkan sekarang' })).toBeNull();
    await fireEvent.press(screen.getByTestId('share-report'));
    expect(share.mock.calls[0][0].message).toMatch(/^MODE DEMO/);
    share.mockRestore();
  });
});
