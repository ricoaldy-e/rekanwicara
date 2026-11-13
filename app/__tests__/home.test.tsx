import { fireEvent, render, screen } from '@testing-library/react-native';

import Home from '../app/(tabs)/home';
import { newProfile, type Attempt } from '../src/user/pure';

const mockPush = jest.fn();
const mockReload = jest.fn();
let mockProfile = { ...newProfile(), calibrated: true };
let mockCatalog: { data: unknown; loading: boolean; error: unknown; reload: jest.Mock };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({ health: null, healthError: null }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile, demo: false }) }));
jest.mock('../src/data/useCatalog', () => ({ useCatalog: () => mockCatalog }));

const item = (itemId: string) => ({ key: itemId, itemId, level: 1, text: itemId, instruction: '', source: 'default' });
const attempt = (itemId: string, overall: Attempt['overall'], at = '2026-11-13T10:00:00.000Z'): Attempt => ({
  id: `${itemId}-${at}-${overall}`, itemId, level: 1, sessionId: 's', at, overall, score: 0,
  indicators: { bibir: overall, suara: overall }, hintId: '', scorer: 'rules', engineVersion: 't', synced: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = { ...newProfile(), calibrated: true };
  mockCatalog = {
    data: {
      level1: ['l1_a', 'l1_i', 'l1_u', 'l1_o', 'l0_hold_a', 'l0_soft_loud'].map(item),
      words: [
        { id: 'l3_mama', text: 'MAMA', source: 'default', hasLevel2: true },
        { id: 'l3_papa', text: 'PAPA', source: 'default', hasLevel2: true },
      ],
    },
    loading: false,
    error: null,
    reload: mockReload,
  };
});

it('shows two cards with "x dari N sesuai" counted per unique item', async () => {
  mockProfile.attempts = [attempt('l1_a', 'merah'), attempt('l1_a', 'hijau'), attempt('l1_a', 'hijau'), attempt('l1_i', 'kuning')];
  await render(<Home />);
  expect(screen.getByRole('button', { name: 'Level 1, Bunyi vokal, 1 dari 6 sesuai' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Level 2 dan 3, Pilih kata, 0 dari 2 sesuai' })).toBeTruthy();
  expect(screen.queryByText(/Misi hari ini/)).toBeNull();
  expect(screen.queryByText(/Terkunci/)).toBeNull();
});

it('opens Level 1, Pilih kata and About', async () => {
  await render(<Home />);
  await fireEvent.press(screen.getByTestId('card-level-1'));
  expect(mockPush).toHaveBeenLastCalledWith('/home/level-1');
  await fireEvent.press(screen.getByTestId('card-words'));
  expect(mockPush).toHaveBeenLastCalledWith('/home/words');
  await fireEvent.press(screen.getByRole('button', { name: 'Tentang aplikasi' }));
  expect(mockPush).toHaveBeenLastCalledWith('/about');
});

it('shows the calibration note only before calibration', async () => {
  await render(<Home />);
  expect(screen.queryByTestId('calibration-banner')).toBeNull();
  mockProfile = { ...newProfile(), calibrated: false };
  await render(<Home />);
  expect(screen.getByTestId('calibration-banner')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Kalibrasi sekarang' }));
  expect(mockPush).toHaveBeenLastCalledWith('/calibration');
});

it('offers a retry when the catalog fails and hides the cards', async () => {
  mockCatalog = { ...mockCatalog, data: null, error: new Error('x') };
  await render(<Home />);
  expect(screen.getByTestId('home-error')).toBeTruthy();
  expect(screen.queryByTestId('card-level-1')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
  expect(mockReload).toHaveBeenCalledTimes(1);
});
