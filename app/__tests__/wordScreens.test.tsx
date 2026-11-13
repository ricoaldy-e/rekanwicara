import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import NewWord from '../app/(tabs)/companion/words/new';
import EditWord from '../app/(tabs)/companion/words/[wordId]/edit';
import { getCatalog, getWord } from '../src/data/catalog';
import { catalogToWords } from '../src/data/mappers';
import { MOCK_CATALOG } from '../src/mock';
import { createMockWordStore } from '../src/mock/words';

const mockBack = jest.fn();
let mockWordId = 'l3_mama';
const mockWords = () => catalogToWords(MOCK_CATALOG);
let mockStore: ReturnType<typeof createMockWordStore>;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ wordId: mockWordId }),
  useNavigation: () => ({ goBack: mockBack, dispatch: jest.fn() }),
}));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: () => {} }));
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return { useVideoPlayer: () => ({}), VideoView: () => <View /> };
});
jest.mock('../src/data/pickVideo', () => ({
  pickFromGallery: async () => ({ kind: 'picked', file: { uri: 'file:///v.mp4', mimeType: 'video/mp4', fileSize: 1000, durationMs: 4000 } }),
  recordWithCamera: async () => ({ kind: 'cancelled' }),
}));
jest.mock('../src/data/media', () => ({ getWordStore: () => mockStore }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/data/useCatalog', () => ({
  useCatalog: () => ({ data: { level1: [], words: mockWords() }, loading: false, error: null, reload: jest.fn() }),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockStore = createMockWordStore();
  mockWordId = 'l3_mama';
});

it('adds a word through the form and it reaches Pilih kata with its syllables', async () => {
  await render(<NewWord />);
  await waitFor(() => expect(screen.getByTestId('word-text')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
  await fireEvent.press(screen.getByTestId('word-video-gallery'));
  await fireEvent.changeText(screen.getByTestId('word-instruction'), 'Bulatkan bibir dan ucapkan susu.');
  for (const i of [1, 2]) {
    await fireEvent.press(screen.getByTestId('add-syllable'));
    await fireEvent.changeText(screen.getByTestId(`syllable-${i}-text`), 'su');
    await fireEvent.press(screen.getByTestId(`syllable-${i}-video-gallery`));
    await fireEvent.changeText(screen.getByTestId(`syllable-${i}-instruction`), 'Bulatkan bibir, ucapkan su.');
  }
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());

  const catalog = await getCatalog({ baseUrl: '', mock: true });
  const added = catalog.words.find((w) => w.text === 'SUSU');
  expect(added).toMatchObject({ source: 'custom', has_level_2: true });
  const dto = await getWord(added!.id, { baseUrl: '', mock: true });
  expect(dto.level_2.map((s) => s.text)).toEqual(['SU', 'SU']);
});

it('refuses a word that is already built in (MAMA)', async () => {
  await render(<NewWord />);
  await waitFor(() => expect(screen.getByTestId('word-text')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('word-text'), 'mama');
  await fireEvent(screen.getByTestId('word-text'), 'blur');
  expect(screen.getByTestId('word-text-error')).toHaveAccessibleName('Kata ini sudah ada.');
});

it('has no way to edit a built-in word: it is not found', async () => {
  await render(<EditWord />);
  await waitFor(() => expect(screen.getByTestId('word-not-found')).toBeTruthy());
  expect(screen.queryByTestId('word-save')).toBeNull();
});

it('edits a companion word and keeps its stored videos', async () => {
  mockWordId = 'custom_word:22222222-2222-2222-2222-222222222222';
  await render(<EditWord />);
  await waitFor(() => expect(screen.getByTestId('word-text').props.value).toBe('MINUM'));
  await fireEvent.changeText(screen.getByTestId('word-instruction'), 'Rapatkan bibir lalu ucapkan minum.');
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const dto = await getWord(mockWordId, { baseUrl: '', mock: true });
  expect(dto.level_3.instruction).toBe('Rapatkan bibir lalu ucapkan minum.');
  expect(dto.level_3.videos).toHaveLength(1);
});
