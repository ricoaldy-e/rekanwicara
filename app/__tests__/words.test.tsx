import { fireEvent, render, screen, within } from '@testing-library/react-native';

import WordPath from '../app/(tabs)/home/words/[wordId]';
import Words from '../app/(tabs)/home/words';
import { catalogToWords, wordToPath } from '../src/data/mappers';
import { MOCK_CATALOG, MOCK_WORDS } from '../src/mock';
import { newProfile, type Attempt } from '../src/user/pure';

const mockPush = jest.fn();
let mockProfile = newProfile();
let mockWordId = 'l3_papa';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ wordId: mockWordId }),
}));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile }) }));
jest.mock('../src/config', () => ({ ...jest.requireActual('../src/config'), ANALYZE_API: 'v1' }));
jest.mock('../src/data/useCatalog', () => ({
  useCatalog: () => ({ data: { level1: [], words: mockWords() }, loading: false, error: null, reload: jest.fn() }),
  useWordPath: (id: string) => ({ data: mockPath(id), loading: false, error: null, reload: jest.fn() }),
}));

const mockWords = () => catalogToWords(MOCK_CATALOG);
const mockPath = (id: string) => (MOCK_WORDS[id] ? wordToPath(MOCK_WORDS[id]) : null);

const attempt = (itemId: string, overall: Attempt['overall']): Attempt => ({
  id: `${itemId}-${overall}`, itemId, level: 2, sessionId: 's', at: '2026-11-13T10:00:00.000Z', overall, score: 0,
  indicators: { bibir: overall, suara: overall }, hintId: '', scorer: 'rules', engineVersion: 't', synced: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = newProfile();
  mockWordId = 'l3_papa';
});

describe('Pilih kata', () => {
  it('lists the four words with the right source chip', async () => {
    await render(<Words />);
    expect(screen.getAllByTestId(/^word-/)).toHaveLength(4);
    expect(screen.getAllByText('Bawaan')).toHaveLength(3); // two row chips + the filter segment
    expect(screen.getAllByText('Dari Pendamping')).toHaveLength(2);
    expect(screen.queryByText(/Terkunci/)).toBeNull();
  });

  it('opens the path of the tapped word', async () => {
    await render(<Words />);
    await fireEvent.press(screen.getByTestId('word-l3_mama'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/home/words/[wordId]', params: { wordId: 'l3_mama' } });
  });
});

describe('Pilih kata: filter and rows', () => {
  it('filters by source with the segmented control, state only', async () => {
    await render(<Words />);
    expect(screen.getByRole('radio', { name: 'Semua kata' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Pendamping' }));
    expect(screen.getAllByTestId(/^word-/)).toHaveLength(2);
    expect(screen.queryByTestId('word-l3_mama')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Bawaan' }));
    expect(screen.getAllByTestId(/^word-/)).toHaveLength(2);
    expect(screen.getByTestId('word-l3_mama')).toBeTruthy();
    expect(screen.queryByTestId('word-custom_word:11111111-1111-1111-1111-111111111111')).toBeNull();
  });

  it('shows the word in lower case with its syllables and "Belum dicoba" or the best status', async () => {
    mockProfile.attempts = [{ ...attempt('l3_papa', 'hijau'), level: 3 }];
    await render(<Words />);
    const papa = screen.getByTestId('word-l3_papa');
    expect(within(papa).getByText('papa')).toBeTruthy();
    expect(within(papa).getByText('Suku kata: pa · pa')).toBeTruthy();
    expect(within(papa).getByText('Sesuai')).toBeTruthy();
    expect(within(screen.getByTestId('word-l3_mama')).getByText('Belum dicoba')).toBeTruthy();
  });
});

describe('Pilih kata: Level 2 summary', () => {
  it('counts the syllables per unique itemId and Level 3 separately', async () => {
    mockProfile.attempts = [attempt('l2_pa', 'hijau'), attempt('l2_ma', 'merah')];
    await render(<Words />);
    expect(screen.getByRole('button', { name: /^PAPA, bawaan, Level 2: 1 dari 1 sesuai · Level 3: belum$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^MAMA, bawaan, Level 2: 0 dari 1 sesuai · Level 3: belum$/ })).toBeTruthy();
  });

  it('leaves Level 2 out for a word without syllables', async () => {
    await render(<Words />);
    expect(screen.getByRole('button', { name: /^MINUM, dari Pendamping, Level 3: belum$/ })).toBeTruthy();
  });
});

describe('Jalur kata', () => {
  it('shows two PA cards and one PAPA card, with "Berikutnya" on the first', async () => {
    await render(<WordPath />);
    expect(screen.getByText('Level 2 · Suku kata')).toBeTruthy();
    expect(screen.getByTestId('step-l2_pa#1')).toBeTruthy();
    expect(screen.getByTestId('step-l2_pa#2')).toBeTruthy();
    expect(screen.getByTestId('step-l3_papa')).toBeTruthy();
    expect(screen.getAllByTestId('next-marker')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^PA, Level 2, belum dicoba, berikutnya$/ })).toBeTruthy();
  });

  it('moves "Berikutnya" to the whole word once PA is sesuai, and both PA cards share the status', async () => {
    mockProfile.attempts = [attempt('l2_pa', 'hijau')];
    await render(<WordPath />);
    expect(screen.getAllByText('Sesuai')).toHaveLength(2); // both PA cards share the status, shown as icon + text
    expect(screen.getAllByTestId('next-marker')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^PAPA, Level 3, belum dicoba, berikutnya$/ })).toBeTruthy();
  });

  it('sends wordId and position for a syllable, wordId alone for the whole word', async () => {
    await render(<WordPath />);
    await fireEvent.press(screen.getByTestId('step-l2_pa#2'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/practice/[itemId]', params: { itemId: 'l2_pa', wordId: 'l3_papa', position: '2' } });
    await fireEvent.press(screen.getByTestId('step-l3_papa'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/practice/[itemId]', params: { itemId: 'l3_papa', wordId: 'l3_papa' } });
  });

  it('goes straight to Level 3 for a word without syllables', async () => {
    mockWordId = 'custom_word:22222222-2222-2222-2222-222222222222';
    await render(<WordPath />);
    expect(screen.queryByText('Level 2 · Suku kata')).toBeNull();
    expect(screen.getByText('Level 3 · Kata')).toBeTruthy();
    expect(screen.getByTestId('word-not-supported')).toBeTruthy(); // custom word, ANALYZE_API=v1
  });

  it('says when the word does not exist', async () => {
    mockWordId = 'nope';
    await render(<WordPath />);
    expect(screen.getByTestId('word-not-found')).toBeTruthy();
  });
});

describe('Jalur kata layout', () => {
  it('titles the word in lower case with its source and numbers the syllable cards', async () => {
    await render(<WordPath />);
    expect(screen.getByRole('header', { name: 'papa' })).toBeTruthy();
    expect(screen.getByText('Bawaan')).toBeTruthy();
    expect(screen.getByText('Suku kata 1')).toBeTruthy();
    expect(screen.getByText('Suku kata 2')).toBeTruthy();
    expect(screen.getByText('Kata utuh')).toBeTruthy();
    expect(within(screen.getByTestId('step-l2_pa#1')).getByText('Berikutnya')).toBeTruthy();
  });
});
