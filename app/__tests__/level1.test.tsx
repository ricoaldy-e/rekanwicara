import { fireEvent, render, screen } from '@testing-library/react-native';

import LevelOne from '../app/(tabs)/home/level-1';
import { catalogToL1 } from '../src/data/mappers';
import { MOCK_CATALOG } from '../src/mock';
import { newProfile, type Attempt } from '../src/user/pure';

const mockPush = jest.fn();
let mockProfile = newProfile();
const mockLevel1 = () => catalogToL1(MOCK_CATALOG);
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile }) }));
jest.mock('../src/data/useCatalog', () => ({
  useCatalog: () => ({ data: { level1: mockLevel1(), words: [] }, loading: false, error: null, reload: jest.fn() }),
}));

const attempt = (itemId: string, overall: Attempt['overall'], at: string): Attempt => ({
  id: `${itemId}-${at}`, itemId, level: 1, sessionId: 's', at, overall, score: 0,
  indicators: { bibir: overall, suara: overall }, hintId: '', scorer: 'rules', engineVersion: 't', synced: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = newProfile();
});

it('lists the five Level 1 vowels in catalog order with their last status', async () => {
  mockProfile.attempts = [attempt('l1_a', 'hijau', '2026-11-13T09:00:00.000Z'), attempt('l1_a', 'kuning', '2026-11-13T10:00:00.000Z')];
  await render(<LevelOne />);
  const ids = ['l1_a', 'l1_i', 'l1_u', 'l1_e', 'l1_o'];
  expect(screen.getAllByTestId(/^item-/).map((el) => el.props.testID)).toEqual(ids.map((id) => `item-${id}`));
  expect(screen.getByRole('button', { name: 'A, terakhir Mendekati' })).toBeTruthy();
  expect(screen.getByText('Mendekati')).toBeTruthy(); // the badge shows the status as icon + text (Figma 37:287)
  expect(screen.getByRole('button', { name: 'I, belum dicoba' })).toBeTruthy();
  expect(screen.queryByText(/Terkunci/)).toBeNull();
});

it('opens a practice session for the tapped sound', async () => {
  await render(<LevelOne />);
  await fireEvent.press(screen.getByTestId('item-l1_e'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/practice/[itemId]', params: { itemId: 'l1_e' } });
});

it('titles each sound like Figma, shows "Belum dicoba" for untried ones and the progress banner', async () => {
  mockProfile.attempts = [attempt('l1_a', 'hijau', '2026-11-13T09:00:00.000Z')];
  await render(<LevelOne />);
  expect(screen.getByText('Vokal “a”')).toBeTruthy();
  expect(screen.getByText('Bibir terbuka')).toBeTruthy();
  expect(screen.getByText('Bibir setengah terbuka')).toBeTruthy();
  expect(screen.queryByText('Pelan ke keras')).toBeNull();
  expect(screen.getAllByText('Belum dicoba')).toHaveLength(4);
  expect(screen.getByTestId('level1-progress')).toHaveAccessibleName('Kemajuan vokal. 1 dari 5 bunyi sesuai');
  expect(screen.getByText('Sesuai')).toBeTruthy();
});
