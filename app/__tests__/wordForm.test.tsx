import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { WordForm } from '../src/components/form/WordForm';
import { VideoField } from '../src/components/form/VideoField';
import type { PickResult } from '../src/data/pickVideo';
import { formDataOf, type VideoFile, type WordFormData } from '../src/data/words';
import { VIDEO_LIMITS } from '../src/forms/limits';

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockGallery = jest.fn<Promise<PickResult>, []>();
const mockCamera = jest.fn<Promise<PickResult>, []>();
const mockOpenSettings = jest.fn();
let mockPrevent: { prevent: boolean; cb: (o: { data: { action: unknown } }) => void } = { prevent: false, cb: () => {} };

jest.mock('expo-router', () => ({
  useNavigation: () => ({ goBack: mockGoBack, dispatch: mockDispatch }),
  usePreventRemove: (prevent: boolean, cb: (o: { data: { action: unknown } }) => void) => {
    mockPrevent = { prevent, cb };
  },
}));
jest.mock('../src/data/pickVideo', () => ({ pickFromGallery: () => mockGallery(), recordWithCamera: () => mockCamera() }));
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return { useVideoPlayer: () => ({ muted: false, loop: false }), VideoView: () => <View testID="preview-video" /> };
});
jest.spyOn(require('react-native').Linking, 'openSettings').mockImplementation(mockOpenSettings);

const file = (over: Partial<VideoFile> = {}): VideoFile => ({ uri: 'file:///v.mp4', mimeType: 'video/mp4', fileSize: 1000, durationMs: 4000, ...over });
const EMPTY: WordFormData = { text: '', instruction: '', video: null, syllables: [] };
const GOOD_INSTRUCTION = 'Bulatkan bibir dan ucapkan perlahan.';

beforeEach(() => {
  jest.clearAllMocks();
  mockGallery.mockResolvedValue({ kind: 'picked', file: file() });
  mockCamera.mockResolvedValue({ kind: 'picked', file: file({ uri: 'file:///cam.mp4' }) });
  mockPrevent = { prevent: false, cb: () => {} };
});

type Props = Partial<React.ComponentProps<typeof WordForm>>;
const open = async (props: Props = {}) => {
  const onSubmit = props.onSubmit ?? jest.fn().mockResolvedValue(undefined);
  const onClose = props.onClose ?? jest.fn();
  await render(<WordForm initial={EMPTY} otherWords={[]} onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose };
};

async function fillWord(text = 'susu') {
  await fireEvent.changeText(screen.getByTestId('word-text'), text);
  await fireEvent.press(screen.getByTestId('word-video-gallery'));
  await fireEvent.changeText(screen.getByTestId('word-instruction'), GOOD_INSTRUCTION);
}
async function addSyllable(i: number, text = 'su') {
  await fireEvent.press(screen.getByTestId('add-syllable'));
  await fireEvent.changeText(screen.getByTestId(`syllable-${i}-text`), text);
  await fireEvent.press(screen.getByTestId(`syllable-${i}-video-gallery`));
  await fireEvent.changeText(screen.getByTestId(`syllable-${i}-instruction`), GOOD_INSTRUCTION);
}

describe('WordForm required fields', () => {
  it('sending an empty form shows every error per block and does not save', async () => {
    const { onSubmit } = await open();
    await fireEvent.press(screen.getByTestId('word-save'));
    expect(screen.getByTestId('word-text-error')).toHaveAccessibleName('Isi kata yang akan dilatih.');
    expect(screen.getByTestId('word-instruction-error')).toHaveAccessibleName('Isi instruksi pelafalan atau buat dengan AI.');
    expect(screen.getByTestId('word-video-error')).toHaveAccessibleName('Pilih atau rekam video contoh.');
    expect(screen.getByTestId('consent-error')).toHaveAccessibleName('Centang persetujuan untuk menyimpan.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('a syllable row is required in full once added (text, video, instruction)', async () => {
    const { onSubmit } = await open();
    await fillWord();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('add-syllable'));
    await fireEvent.press(screen.getByTestId('word-save'));
    expect(screen.getByTestId('syllable-1-text-error')).toHaveAccessibleName('Isi suku kata atau hapus baris ini.');
    expect(screen.getByTestId('syllable-1-video-error')).toHaveAccessibleName('Pilih atau rekam video contoh.');
    expect(screen.getByTestId('syllable-1-instruction-error')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a word that already exists, ignoring letter case', async () => {
    await open({ otherWords: ['Mama'] });
    await fireEvent.changeText(screen.getByTestId('word-text'), 'mama');
    await fireEvent(screen.getByTestId('word-text'), 'blur');
    expect(screen.getByTestId('word-text-error')).toHaveAccessibleName('Kata ini sudah ada.');
  });
});

describe('syllables', () => {
  it('stops at 6 and says so', async () => {
    await open();
    for (let i = 1; i <= 6; i++) await fireEvent.press(screen.getByTestId('add-syllable'));
    expect(screen.getByRole('button', { name: 'Tambah suku kata' })).toBeDisabled();
    expect(screen.getByTestId('syllables-full')).toHaveTextContent('Maksimal 6 suku kata');
  });

  it('Naik and Turun change the order, and the end rows cannot move out', async () => {
    await open();
    await addSyllable(1, 'ma');
    await addSyllable(2, 'ta');
    expect(screen.getByTestId('syllable-1-up')).toBeDisabled();
    expect(screen.getByTestId('syllable-2-down')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('syllable-1-down'));
    expect(screen.getByTestId('syllable-1-text').props.value).toBe('ta');
    expect(screen.getByTestId('syllable-2-text').props.value).toBe('ma');
  });

  it('deleting a row with content asks first; an empty row goes at once', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('add-syllable'));
    await fireEvent.press(screen.getByTestId('syllable-1-remove'));
    expect(screen.queryByTestId('syllable-1')).toBeNull();
    await addSyllable(1);
    await fireEvent.press(screen.getByTestId('syllable-1-remove'));
    expect(screen.getByText('Hapus suku kata ini?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-ok'));
    expect(screen.queryByTestId('syllable-1')).toBeNull();
  });

  it('warns, but does not block, when the syllables do not add up to the word', async () => {
    const { onSubmit } = await open();
    await fillWord('mama');
    await addSyllable(1, 'ma');
    await addSyllable(2, 'mi');
    expect(screen.getByTestId('syllable-match-warning')).toHaveAccessibleName(/Gabungan suku kata \(“ma-mi”\) berbeda dari kata \(“mama”\)/);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('word-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});

describe('saving', () => {
  it('needs the video consent, then saves the cleaned values in capitals and closes', async () => {
    const { onSubmit, onClose } = await open();
    await fillWord('  su   su ');
    await addSyllable(1, ' su ');
    await fireEvent.press(screen.getByTestId('word-save'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('consent-error')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('word-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const data = (onSubmit as jest.Mock).mock.calls[0][0] as WordFormData;
    expect(data.text).toBe('SU SU');
    expect(data.syllables[0]).toMatchObject({ text: 'SU', instruction: GOOD_INSTRUCTION });
    expect(data.video).toMatchObject({ kind: 'new' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('a failed save keeps every value, shows the banner, and "Coba lagi" tries again', async () => {
    const onSubmit = jest.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);
    const { onClose } = await open({ onSubmit });
    await fillWord();
    await addSyllable(1);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('word-save'));
    await waitFor(() => expect(screen.getByTestId('word-form-banner')).toHaveAccessibleName('Unggah gagal. Periksa koneksi lalu coba lagi.'));
    expect(screen.getByTestId('word-text').props.value).toBe('susu');
    expect(screen.getByTestId('syllable-1-text').props.value).toBe('su');
    expect(screen.getByTestId('word-instruction').props.value).toBe(GOOD_INSTRUCTION);
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('shows the upload progress as text and a bar, and "Batalkan" aborts without an error', async () => {
    let signal!: AbortSignal;
    let report!: (d: number, t: number) => void;
    const onSubmit = jest.fn((_d, onProgress, s: AbortSignal) => {
      report = onProgress;
      signal = s;
      return new Promise<void>((_, reject) => s.addEventListener('abort', () => reject(new Error('cancelled'))));
    });
    await open({ onSubmit });
    await fillWord();
    await fireEvent.press(screen.getByRole('checkbox'));
    void fireEvent.press(screen.getByTestId('word-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => report);
    report(1, 3);
    await waitFor(() => expect(screen.getByTestId('upload-progress')).toHaveTextContent(/Mengunggah video 2 dari 3 · 33%/));
    await fireEvent.press(screen.getByTestId('cancel-upload'));
    await waitFor(() => expect(signal.aborted).toBe(true));
    await waitFor(() => expect(screen.queryByTestId('upload-progress')).toBeNull());
    expect(screen.queryByTestId('word-form-banner')).toBeNull();
    expect(screen.getByTestId('word-text').props.value).toBe('susu');
  });
});

describe('leaving the form', () => {
  it('lets go at once when nothing changed, and asks "Buang perubahan?" when something did', async () => {
    await open();
    expect(mockPrevent.prevent).toBe(false);
    await fireEvent.changeText(screen.getByTestId('word-text'), 's');
    expect(mockPrevent.prevent).toBe(true);
    await fireEvent.press(screen.getByTestId('word-cancel'));
    expect(mockGoBack).toHaveBeenCalled();
    // The navigator would now call back the guard with the blocked action:
    const action = { type: 'GO_BACK' };
    await fireEvent.changeText(screen.getByTestId('word-text'), 'su');
    mockPrevent.cb({ data: { action } });
    await waitFor(() => expect(screen.getByText('Buang perubahan?')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-cancel'));
    expect(mockDispatch).not.toHaveBeenCalled();
    mockPrevent.cb({ data: { action } });
    await waitFor(() => expect(screen.getByTestId('confirm-ok')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-ok'));
    expect(mockDispatch).toHaveBeenCalledWith(action);
  });

  it('an edit keeps the stored videos and is not dirty until something changes', async () => {
    const stored = formDataOf({
      word: { id: 'w', text: 'MAMA', instruction: GOOD_INSTRUCTION },
      syllables: [
        { id: 's2', word_id: 'w', text: 'MA', position: 2, instruction: GOOD_INSTRUCTION },
        { id: 's1', word_id: 'w', text: 'MA', position: 1, instruction: GOOD_INSTRUCTION },
      ],
      videos: [
        { material_id: 'w', word_id: 'w', storage_path: 'a.mp4', sort_order: 1 },
        { material_id: 's1', word_id: 'w', storage_path: 'b.mp4', sort_order: 1 },
        { material_id: 's2', word_id: 'w', storage_path: 'c.mp4', sort_order: 1 },
      ],
    });
    expect(stored.syllables.map((s) => s.id)).toEqual(['s1', 's2']); // position order
    expect(stored.video).toEqual({ kind: 'kept', path: 'a.mp4' });
    const { onSubmit } = await open({ initial: stored });
    expect(mockPrevent.prevent).toBe(false);
    expect(screen.getAllByText('Video sudah tersimpan.')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('word-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect((onSubmit as jest.Mock).mock.calls[0][0].video).toEqual({ kind: 'kept', path: 'a.mp4' });
  });
});

describe('VideoField', () => {
  const field = async (value = null as React.ComponentProps<typeof VideoField>['value']) => {
    const onChange = jest.fn();
    await render(<VideoField testID="v" label="Video kata" value={value} onChange={onChange} />);
    return onChange;
  };

  it('accepts a good video from the gallery or the camera', async () => {
    const onChange = await field();
    await fireEvent.press(screen.getByTestId('v-gallery'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ kind: 'new', file: file() }));
    await fireEvent.press(screen.getByTestId('v-camera'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ kind: 'new', file: file({ uri: 'file:///cam.mp4' }) }));
  });

  it.each([
    [{ mimeType: 'video/webm' }, 'Format belum didukung. Gunakan MP4 atau MOV.'],
    [{ fileSize: 62 * 1024 * 1024 }, 'Video terlalu besar (62 MB). Maksimal 50 MB.'],
    [{ durationMs: VIDEO_LIMITS.maxDurationMs + 1 }, 'Video terlalu panjang. Maksimal 30 detik.'],
  ])('refuses %j with its reason and does not change the value', async (over, message) => {
    mockGallery.mockResolvedValue({ kind: 'picked', file: file(over) });
    const onChange = await field();
    await fireEvent.press(screen.getByTestId('v-gallery'));
    await waitFor(() => expect(screen.getByTestId('v-error')).toHaveAccessibleName(message));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a cancelled pick changes nothing and shows nothing', async () => {
    mockGallery.mockResolvedValue({ kind: 'cancelled' });
    const onChange = await field();
    await fireEvent.press(screen.getByTestId('v-gallery'));
    await waitFor(() => expect(mockGallery).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('v-error')).toBeNull();
  });

  it('a refused camera permission says why and offers "Buka pengaturan"', async () => {
    mockCamera.mockResolvedValue({ kind: 'denied' });
    await field();
    await fireEvent.press(screen.getByTestId('v-camera'));
    await waitFor(() => expect(screen.getByTestId('v-denied')).toHaveAccessibleName('Izin kamera dibutuhkan untuk merekam video. Buka pengaturan untuk mengizinkan.'));
    await fireEvent.press(screen.getByRole('button', { name: 'Buka pengaturan' }));
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('with a value: a muted preview, replace buttons and Hapus video', async () => {
    const onChange = await field({ kind: 'new', file: file() });
    expect(screen.getByTestId('preview-video')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ganti dari galeri, Video kata' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('v-remove'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
