import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LevelOneList } from '../src/home/LevelOneList';

const mockPush = jest.fn();
const mockCatalog = jest.fn();
const mockApi = { getV2Catalog: mockCatalog };
const UID = '11111111-1111-4111-8111-111111111111';
let mockUid: string | null = UID;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('../src/auth/companion', () => ({
  getCompanionSession: async () => mockUid ? { user: { id: mockUid }, access_token: 'current-token' } : null,
}));
const catalog = { level_1: ['A', 'I', 'U', 'E', 'O'].map((text) => ({
  id: 'l1_' + text.toLowerCase(), text, instruction: 'Ucapkan ' + text, videos: [],
})), words: [] };
beforeEach(() => {
  jest.clearAllMocks();
  mockUid = UID;
  mockCatalog.mockReset().mockResolvedValue(catalog);
});
it('shows all five vowels including E/O and opens the selected material on v2', async () => {
  await render(<LevelOneList ownerId={UID} />);
  await waitFor(() => expect(screen.getByTestId('level-one-l1_e')).toBeTruthy());
  for (const vowel of 'aiueo') expect(screen.getByTestId('level-one-l1_' + vowel)).toBeTruthy();
  expect(mockCatalog).toHaveBeenCalledWith('current-token');
  await fireEvent.press(screen.getByLabelText('Latihan E'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/practice/[itemId]', params: { itemId: 'l1_e', v2: '1' } });
  expect(screen.getAllByText(/video contoh belum tersedia/)).toHaveLength(5);
});
it('offers recovery after a catalog error', async () => {
  mockCatalog.mockRejectedValueOnce(new Error('offline'));
  await render(<LevelOneList ownerId={UID} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Muat ulang Level 1' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Muat ulang Level 1' }));
  await waitFor(() => expect(screen.getByTestId('level-one-l1_o')).toBeTruthy());
});
it('does not show a delayed catalog from the previous account', async () => {
  let finish!: (value: typeof catalog) => void;
  mockCatalog.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const view = await render(<LevelOneList ownerId={UID} />);
  await waitFor(() => expect(mockCatalog).toHaveBeenCalledTimes(1));
  mockUid = '22222222-2222-4222-8222-222222222222';
  mockCatalog.mockResolvedValue({ level_1: [], words: [] });
  await view.rerender(<LevelOneList ownerId={mockUid} />);
  finish(catalog);
  await waitFor(() => expect(screen.getByLabelText('Materi Level 1 belum tersedia.')).toBeTruthy());
  expect(screen.queryByTestId('level-one-l1_a')).toBeNull();
});
