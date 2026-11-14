import { fireEvent, render, screen } from '@testing-library/react-native';

import Home from '../app/home';
import type { Item, Status } from '../src/api/types';
import { buildProgress, type ItemProgress } from '../src/state/progression';
import { newProfile, type Attempt } from '../src/user/pure';

const mockReload = jest.fn();
const mockPush = jest.fn();
let mockProfile = { ...newProfile(), calibrated: true };
let mockItems: Item[] = [];
let mockProgress = new Map<string, ItemProgress>();
let mockSession: { user: { id: string } } | null = null;
let mockDemo = true;
jest.mock('../src/home/LevelOneList', () => ({ LevelOneList: () => {
  const { Text } = require('react-native'); return <Text>Daftar Level 1 dari v2</Text>;
} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({
  health: null, items: mockItems, loading: false, error: null, healthError: null, reload: mockReload,
}) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile, progress: mockProgress, demo: mockDemo, session: mockSession }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = { ...newProfile(), calibrated: true };
  mockItems = [];
  mockProgress = new Map();
  mockSession = null;
  mockDemo = true;
});

it('shows the v2 Level 1 group after login without duplicating legacy level zero and one', async () => {
  mockSession = { user: { id: '11111111-1111-4111-8111-111111111111' } };
  mockDemo = false;
  mockItems = [material('l0_hold_a', 0), material('l1_a', 1)];
  await render(<Home />);
  expect(screen.getByText('Beranda')).toBeTruthy();
  expect(screen.getByText('Daftar Level 1 dari v2')).toBeTruthy();
  expect(screen.queryByTestId('item-l1_a')).toBeNull();
  expect(screen.queryByTestId('item-l0_hold_a')).toBeNull();
  expect(screen.queryByTestId('mission')).toBeNull();
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
  await fireEvent.press(screen.getByRole('button', { name: 'Mode Pendamping' }));
  expect(mockPush).toHaveBeenCalledWith('/companion');
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
