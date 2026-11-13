import { fireEvent, render, screen } from '@testing-library/react-native';

import Home from '../app/(tabs)/home';
import type { Item, Status } from '../src/api/types';
import { buildProgress, type ItemProgress } from '../src/state/progression';
import { newProfile, type Attempt } from '../src/user/pure';

const mockReload = jest.fn();
const mockPush = jest.fn();
let mockProfile = { ...newProfile(), calibrated: true };
let mockItems: Item[] = [];
let mockProgress = new Map<string, ItemProgress>();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({
  health: null, items: mockItems, loading: false, error: null, healthError: null, reload: mockReload,
}) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile, progress: mockProgress, demo: true }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = { ...newProfile(), calibrated: true };
  mockItems = [];
  mockProgress = new Map();
});

const material = (id: string, level: number): Item => ({
  item_id: id, level, text: id.slice(3), units: ['a'], priority: 'required', emoji: null, active: true,
});

function history(itemId: string, level: number, overall: Status, count: number): Attempt[] {
  const start = Date.now() - 30 * 86_400_000;
  return Array.from({ length: count }, (_, k): Attempt => ({
    id: `synthetic-${itemId}-${k}`, itemId, level, sessionId: `s${Math.floor(k / 3)}`,
    at: new Date(start + k * 60_000).toISOString(), overall, score: overall === 'hijau' ? 1 : 0,
    indicators: { bibir: overall, suara: overall }, hintId: 'closure_missing',
    scorer: 'rules', engineVersion: 'test', synced: false,
  }));
}

it('offers recovery for an empty list, labels demo data and links to About', async () => {
  await render(<Home />);
  expect(screen.getByLabelText(/Mode demo: progres contoh/)).toBeTruthy();
  expect(screen.getByLabelText(/Materi belum tersedia/)).toBeTruthy();
  expect(screen.queryByTestId('mission-needs-help')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Muat ulang materi' }));
  expect(mockReload).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Tentang aplikasi' }));
  expect(mockPush).toHaveBeenCalledWith('/about');
});

it.each([false, true])('directs the user to Companion when no replacement exists (warm-up: %s)', async (warmup) => {
  mockItems = [...(warmup ? [material('l0_hold_a', 0)] : []), material('l2_ma', 2), material('l3_mama', 3)];
  mockProfile.attempts = history('l3_mama', 3, 'merah', 9);
  if (warmup) mockProfile.attempts.push({
    ...mockProfile.attempts[0], id: 'synthetic-warmup', itemId: 'l0_hold_a', level: 0,
    at: new Date().toISOString(), overall: 'hijau', score: 1, indicators: { bibir: null, suara: 'hijau' },
  });
  mockProgress = buildProgress(mockItems, mockProfile.attempts, [], mockProfile.settings, new Date());

  await render(<Home />);
  expect(screen.getByTestId('mission-needs-help')).toHaveTextContent(/Mode Pendamping/);
  expect(screen.queryByText(/Sesi hari ini selesai/)).toBeNull();
  expect(screen.queryByText('Pilih satu materi untuk mulai berlatih.')).toBeNull();
  expect(screen.queryByTestId('mission-start')).toBeNull();
});

it('does not report missing alternatives when due reviews fill a short session', async () => {
  mockItems = [material('l0_hold_a', 0), material('l2_ma', 2), material('l2_mi', 2), material('l3_mama', 3)];
  mockProfile.settings.sessionMinutes = 5;
  mockProfile.attempts = [
    ...history('l2_ma', 2, 'hijau', 10), ...history('l2_mi', 2, 'hijau', 10),
    ...history('l3_mama', 3, 'merah', 9),
  ];
  mockProgress = buildProgress(mockItems, mockProfile.attempts, [], mockProfile.settings, new Date());
  await render(<Home />);
  expect(screen.getByRole('button', { name: 'Pemanasan: hold_a' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ulasan: ma' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ulasan: mi' })).toBeTruthy();
  expect(screen.queryByTestId('mission-needs-help')).toBeNull();
});

it('opens the hidden Settings with a long press on "Misi hari ini"', async () => {
  await render(<Home />);
  await fireEvent(screen.getByLabelText('Misi hari ini'), 'longPress');
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

it('lists only the chosen level', async () => {
  mockItems = [material('l0_hold_a', 0), material('l2_ma', 2)];
  mockProgress = buildProgress(mockItems, [], [], mockProfile.settings, new Date());
  await render(<Home />);
  await fireEvent.press(screen.getByRole('button', { name: /^Level 2: Suku kata/ }));
  expect(screen.getByTestId('item-l2_ma')).toBeTruthy();
  expect(screen.queryByTestId('item-l0_hold_a')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /^Level 0: Suara/ }));
  expect(screen.getByTestId('item-l0_hold_a')).toBeTruthy();
  expect(screen.queryByTestId('item-l2_ma')).toBeNull();
});
