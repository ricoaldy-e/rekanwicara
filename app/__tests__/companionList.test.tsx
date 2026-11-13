import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Companion from '../app/(tabs)/companion';
import { catalogToWords } from '../src/data/mappers';
import { MOCK_CATALOG } from '../src/mock';
import { createMockWordStore } from '../src/mock/words';

const mockPush = jest.fn();
const mockLock = jest.fn();
const mockReload = jest.fn();
let mockStore: ReturnType<typeof createMockWordStore> | null = null;

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('../src/data/media', () => ({ getWordStore: () => mockStore }));
jest.mock('../src/pin/PinSession', () => ({ usePinSession: () => ({ lock: mockLock }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/data/useCatalog', () => ({
  useCatalog: () => ({ data: { level1: [], words: mockWords() }, loading: false, error: null, reload: mockReload }),
}));
const mockWords = () => catalogToWords(MOCK_CATALOG);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockStore = createMockWordStore();
});

it('lists the companion words with labelled edit and delete buttons', async () => {
  await render(<Companion />);
  await waitFor(() => expect(screen.getByText('TOLONG')).toBeTruthy());
  expect(screen.getByText('2 suku kata')).toBeTruthy();
  expect(screen.getByText('Tanpa suku kata')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Ubah TOLONG' }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/companion/words/[wordId]/edit',
    params: { wordId: 'custom_word:11111111-1111-1111-1111-111111111111' },
  });
  await fireEvent.press(screen.getByTestId('add-word'));
  expect(mockPush).toHaveBeenLastCalledWith('/companion/words/new');
});

it('shows built-in words read-only: no edit or delete path', async () => {
  await render(<Companion />);
  await waitFor(() => expect(screen.getByTestId('builtin-l3_mama')).toBeTruthy());
  for (const name of ['MAMA', 'PAPA']) {
    expect(screen.queryByRole('button', { name: `Ubah ${name}` })).toBeNull();
    expect(screen.queryByRole('button', { name: `Hapus ${name}` })).toBeNull();
  }
  expect(screen.getAllByText('Bawaan')).toHaveLength(2);
  // The companion list never contains a built-in word.
  expect(screen.queryByTestId('mine-l3_mama')).toBeNull();
});

it('deletes only after the confirmation, naming the word and its syllable count', async () => {
  await render(<Companion />);
  await waitFor(() => expect(screen.getByText('TOLONG')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Hapus TOLONG' }));
  expect(screen.getByText('Hapus “tolong” dan 2 suku katanya? Ini tidak bisa dibatalkan.')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('confirm-cancel'));
  expect(screen.getByText('TOLONG')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Hapus TOLONG' }));
  await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(screen.queryByText('TOLONG')).toBeNull());
  expect(screen.getByTestId('snackbar')).toHaveAccessibleName('Kata “tolong” dihapus.');
  expect(mockReload).toHaveBeenCalled();
});

it('names a word without syllables plainly in the delete question', async () => {
  await render(<Companion />);
  await waitFor(() => expect(screen.getByText('MINUM')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Hapus MINUM' }));
  expect(screen.getByText('Hapus “minum”? Ini tidak bisa dibatalkan.')).toBeTruthy();
});

it('marks an incomplete word', async () => {
  const rows = await mockStore!.list();
  rows[1].videos = [];
  await AsyncStorage.setItem('rw.mock.customWords', JSON.stringify(rows));
  await render(<Companion />);
  await waitFor(() => expect(screen.getByLabelText('MINUM: Belum lengkap')).toBeTruthy());
});

it('says plainly when companion words are not available', async () => {
  mockStore = null;
  await render(<Companion />);
  expect(screen.getByTestId('companion-unavailable')).toBeTruthy();
  expect(screen.queryByTestId('add-word')).toBeNull();
  expect(screen.getByTestId('builtin-l3_mama')).toBeTruthy();
});

it('"Kunci kembali" ends the companion session', async () => {
  await render(<Companion />);
  await fireEvent.press(screen.getByRole('button', { name: 'Kunci kembali' }));
  expect(mockLock).toHaveBeenCalled();
});
