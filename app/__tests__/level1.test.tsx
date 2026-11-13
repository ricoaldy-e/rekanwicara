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

it('lists the six Level 1 sounds in catalog order with their last status', async () => {
  mockProfile.attempts = [attempt('l1_a', 'hijau', '2026-11-13T09:00:00.000Z'), attempt('l1_a', 'kuning', '2026-11-13T10:00:00.000Z')];
  await render(<LevelOne />);
  const ids = ['l1_a', 'l1_i', 'l1_u', 'l1_o', 'l0_hold_a', 'l0_soft_loud'];
  expect(screen.getAllByTestId(/^item-/).map((el) => el.props.testID)).toEqual(ids.map((id) => `item-${id}`));
  expect(screen.getByRole('button', { name: 'A, terakhir Mendekati' })).toBeTruthy();
  expect(screen.getByLabelText('Terakhir: Mendekati')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'I, belum dicoba' })).toBeTruthy();
  expect(screen.queryByText(/Terkunci/)).toBeNull();
});

it('opens a practice session for the tapped sound', async () => {
  await render(<LevelOne />);
  await fireEvent.press(screen.getByTestId('item-l0_hold_a'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/practice/[itemId]', params: { itemId: 'l0_hold_a' } });
});
