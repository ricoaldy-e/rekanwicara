import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ApiError } from '../src/api/apiError';
import { WordForm } from '../src/components/form/WordForm';
import type { WordFormData } from '../src/data/words';

const mockGenerate = jest.fn();

jest.mock('expo-router', () => ({
  useNavigation: () => ({ goBack: jest.fn(), dispatch: jest.fn() }),
  usePreventRemove: () => {},
}));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ apiUrl: 'http://x' }) }));
jest.mock('../src/data/instructions', () => ({ generateInstruction: (...a: unknown[]) => mockGenerate(...a) }));
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return { useVideoPlayer: () => ({ muted: false, loop: false }), VideoView: () => <View /> };
});

const EMPTY: WordFormData = { text: '', instruction: '', video: null, syllables: [] };
const open = () => render(<WordForm initial={EMPTY} otherWords={[]} onSubmit={jest.fn()} onClose={jest.fn()} />);
const SUGGESTION = 'Rapatkan bibir, lalu ucapkan “susu” pelan-pelan.';

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerate.mockResolvedValue(SUGGESTION);
});

describe('Buat dengan AI', () => {
  it('asks for the word first when it is empty: error under the word, no request', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('word-ai'));
    expect(screen.getByTestId('word-text-error')).toHaveAccessibleName('Isi kata dulu untuk membuat instruksi.');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('sends only the text, fills the instruction, labels it as AI and offers "Buat ulang"', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.press(screen.getByTestId('word-ai'));
    await waitFor(() => expect(screen.getByTestId('word-instruction').props.value).toBe(SUGGESTION));
    expect(mockGenerate).toHaveBeenCalledWith({ type: 'word', text: 'susu' }, expect.objectContaining({ baseUrl: 'http://x' }));
    expect(screen.getByTestId('word-ai-label')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Buat ulang/ })).toBeTruthy();
    expect(screen.getByText(/Kata yang kamu tulis dikirim ke layanan AI/)).toBeTruthy();
    expect(screen.getByText(/bukan saran klinis/)).toBeTruthy();
  });

  it('drops the AI label once the companion edits the text', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.press(screen.getByTestId('word-ai'));
    await waitFor(() => expect(screen.getByTestId('word-ai-label')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('word-instruction'), `${SUGGESTION} Tahan sebentar.`);
    expect(screen.queryByTestId('word-ai-label')).toBeNull();
  });

  it('asks before replacing typed text, and can bring the earlier text back once', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.changeText(screen.getByTestId('word-instruction'), 'Tulisan saya sendiri.');
    await fireEvent.press(screen.getByTestId('word-ai'));
    expect(screen.getByText('Ganti instruksi yang sudah ditulis?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-cancel'));
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(screen.getByTestId('word-instruction').props.value).toBe('Tulisan saya sendiri.');

    await fireEvent.press(screen.getByTestId('word-ai'));
    await fireEvent.press(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(screen.getByTestId('word-instruction').props.value).toBe(SUGGESTION));
    await fireEvent.press(screen.getByTestId('word-ai-undo'));
    expect(screen.getByTestId('word-instruction').props.value).toBe('Tulisan saya sendiri.');
    expect(screen.queryByTestId('word-ai-undo')).toBeNull();
  });

  it('shows "Membuat instruksi…" with a Batal that stops without an error, and locks the field meanwhile', async () => {
    mockGenerate.mockImplementation(
      (_req: unknown, opts: { signal: AbortSignal }) =>
        new Promise<string>((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new ApiError('cancelled', 'x')));
        }),
    );
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.press(screen.getByTestId('word-ai'));
    expect(screen.getByTestId('word-ai-working')).toHaveAccessibleName('Sedang membuat instruksi');
    expect(screen.getByTestId('word-instruction').props.editable).toBe(false);
    await fireEvent.press(screen.getByTestId('word-ai-cancel'));
    await waitFor(() => expect(screen.queryByTestId('word-ai-working')).toBeNull());
    expect(screen.queryByTestId('word-ai-error')).toBeNull();
    expect(screen.getByTestId('word-instruction').props.editable).toBe(true);
  });

  it.each([
    ['network', new ApiError('network', 'x'), 'Tidak ada koneksi. Tulis sendiri atau coba lagi nanti.'],
    ['timeout', new ApiError('timeout', 'x'), 'Instruksi belum bisa dibuat. Tulis sendiri atau coba lagi.'],
    ['503', new ApiError('http', 'x', 503, 'AI_UNAVAILABLE'), 'Instruksi belum bisa dibuat. Tulis sendiri atau coba lagi.'],
  ])('on %s it says what happened and offers "Coba lagi"; other fields keep their values', async (_n, error, text) => {
    mockGenerate.mockRejectedValueOnce(error);
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.press(screen.getByTestId('word-ai'));
    await waitFor(() => expect(screen.getByTestId('word-ai-error')).toBeTruthy());
    expect(within(screen.getByTestId('word-ai-error')).getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByTestId('word-text').props.value).toBe('susu');
    await fireEvent.press(screen.getByTestId('word-ai-retry'));
    await waitFor(() => expect(screen.getByTestId('word-instruction').props.value).toBe(SUGGESTION));
    expect(screen.queryByTestId('word-ai-error')).toBeNull();
  });

  it('too many requests: says so and disables the button for a while; typing still works', async () => {
    mockGenerate.mockRejectedValueOnce(new ApiError('http', 'x', 429, 'GENERATION_RATE_LIMITED'));
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'susu');
    await fireEvent.press(screen.getByTestId('word-ai'));
    await waitFor(() => expect(screen.getAllByText('Terlalu banyak permintaan. Coba lagi sebentar lagi.').length).toBeGreaterThan(0));
    expect(screen.getByTestId('word-ai')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('word-instruction'), 'Ketik sendiri saja.');
    expect(screen.getByTestId('word-instruction').props.value).toBe('Ketik sendiri saja.');
  });

  it('a syllable has its own button and sends its word as context', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('word-text'), 'mama');
    await fireEvent.press(screen.getByTestId('add-syllable'));
    await fireEvent.press(screen.getByTestId('syllable-1-ai'));
    expect(screen.getByTestId('syllable-1-text-error')).toHaveAccessibleName('Isi suku kata dulu untuk membuat instruksi.');
    await fireEvent.changeText(screen.getByTestId('syllable-1-text'), 'ma');
    await act(async () => fireEvent.press(screen.getByTestId('syllable-1-ai')));
    await waitFor(() => expect(screen.getByTestId('syllable-1-instruction').props.value).toBe(SUGGESTION));
    expect(mockGenerate).toHaveBeenCalledWith({ type: 'syllable', text: 'ma', parent_word: 'mama' }, expect.anything());
    expect(screen.getByRole('button', { name: /Buat ulang, Suku kata 1/ })).toBeTruthy();
  });
});
