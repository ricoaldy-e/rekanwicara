import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ManualWords } from '../src/customWords/ManualWords';
import { ApiError } from '../src/api/client';
import type { CustomWordDetail } from '../src/api/types';
import { contractV2 } from '../test-fixtures/api-v2-contract';

const UID = '11111111-1111-4111-8111-111111111111';
const mockList = jest.fn();
const mockGet = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();
const mockLocalDelete = jest.fn();
const mockValidate = jest.fn();
const mockClose = jest.fn();
let mockPermission = true;
let mockClip = 0;
const mockApi = { listCustomWords: mockList, getCustomWord: mockGet, deleteCustomWord: mockDelete };
const word: CustomWordDetail = contractV2.manualWord;

jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('../src/customWords/service', () => ({ ...jest.requireActual('../src/customWords/service'),
  ownerToken: async () => 'fixture-token', saveWord: (...args: unknown[]) => mockSave(...args),
  validateRecording: (...args: unknown[]) => mockValidate(...args),
}));
jest.mock('../src/customWords/VideoPreview', () => {
  const { Text } = require('react-native');
  return { VideoPreview: ({ localUri }: { localUri: string | null }) => <Text>{localUri ? `Preview ${localUri}` : 'Belum ada rekaman'}</Text> };
});
jest.mock('../src/recording/ClipPreview', () => {
  const { Text } = require('react-native');
  return { ClipPreview: ({ uri }: { uri: string }) => <Text>{`Preview ${uri}`}</Text> };
});
jest.mock('../src/recording/localFile', () => ({ deleteLocalFile: (uri: string) => mockLocalDelete(uri) }));
jest.mock('../src/recording/RecordPanel', () => {
  const { Text, Pressable } = require('react-native');
  return { RecordPanel: ({ onRecorded, durationMs }: { onRecorded(uri: string): void; durationMs: number }) => mockPermission
    ? <Pressable accessibilityRole="button" accessibilityLabel="Ambil rekaman uji" onPress={() => onRecorded(`synthetic-clip-${++mockClip}`)}><Text>{durationMs}</Text></Pressable>
    : <Text>Izin kamera dan mikrofon ditolak</Text> };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission = true;
  mockClip = 0;
  mockList.mockResolvedValue({ words: [], max_upload_mb: 50, max_duration_s: 120 });
  mockGet.mockResolvedValue(word);
  mockSave.mockResolvedValue({ ...word, status: 'published' });
  mockDelete.mockResolvedValue({ id: word.id, status: 'deleted' });
  mockValidate.mockReturnValue({ size: 24 });
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

async function start() {
  await render(<ManualWords ownerId={UID} onClose={mockClose} />);
  await waitFor(() => expect(screen.getByText('Belum ada kata buatan Anda. Tambahkan kata pertama.')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Tambah kata'));
  await fireEvent.changeText(screen.getByLabelText('Kata lengkap'), 'KERTAS');
  await fireEvent.changeText(screen.getByLabelText('Instruksi kata lengkap'), 'Ucapkan KERTAS.');
}

async function record(label: string) {
  await fireEvent.press(screen.getByLabelText(label));
  await fireEvent.press(screen.getByLabelText('Ambil rekaman uji'));
  await fireEvent.press(screen.getByLabelText('Gunakan rekaman'));
}

it('records KER, TAS and KERTAS separately and saves the dynamic form', async () => {
  await start();
  expect(screen.getByLabelText('Simpan Kata')).toBeDisabled();
  expect(screen.queryByLabelText('Simpan Draft')).toBeNull();
  expect(screen.queryByLabelText('Publikasikan')).toBeNull();
  for (const [index, text] of ['KER', 'TAS'].entries()) {
    await fireEvent.press(screen.getByLabelText('Tambah suku kata'));
    await fireEvent.changeText(screen.getByLabelText(`Teks suku kata ${index + 1}`), text);
    await fireEvent.changeText(screen.getByLabelText(`Instruksi suku kata ${index + 1}`), `Ucapkan ${text}.`);
    await record(`Rekam video ${text}`);
  }
  await record('Rekam video kata lengkap');
  await fireEvent.press(screen.getByLabelText('Simpan Kata'));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  const form = mockSave.mock.calls[0][2];
  expect(form.localUri).toBe('synthetic-clip-3');
  expect(form.syllables.map((p: { text: string; localUri: string }) => [p.text, p.localUri])).toEqual([
    ['KER', 'synthetic-clip-1'], ['TAS', 'synthetic-clip-2'],
  ]);
  expect(form.syllables[0].id).not.toBe(form.syllables[1].id);
  expect(mockSave.mock.calls[0][3]).toBe('published');
  await waitFor(() => expect(screen.getByText('Kata tersimpan dan tersedia di katalog akun ini.')).toBeTruthy());
  expect(mockLocalDelete).toHaveBeenCalledWith('synthetic-clip-1');
  expect(mockLocalDelete).toHaveBeenCalledWith('synthetic-clip-2');
  expect(mockLocalDelete).toHaveBeenCalledWith('synthetic-clip-3');
  expect(screen.queryByText('Upload Video')).toBeNull();
});

it('supports more than two syllables, reorder by ID, and removal', async () => {
  await start();
  for (const [index, text] of ['KER', 'TAS', 'LA'].entries()) {
    await fireEvent.press(screen.getByLabelText('Tambah suku kata'));
    await fireEvent.changeText(screen.getByLabelText(`Teks suku kata ${index + 1}`), text);
  }
  await record('Rekam video KER');
  await fireEvent.press(screen.getByLabelText('Turunkan suku kata 1'));
  expect(screen.getByLabelText('Teks suku kata 2')).toHaveProp('value', 'KER');
  await fireEvent.press(screen.getByLabelText('Hapus suku kata 3'));
  expect(screen.queryByLabelText('Teks suku kata 3')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Instruksi suku kata 1'), 'Ucapkan TAS.');
  await fireEvent.changeText(screen.getByLabelText('Instruksi suku kata 2'), 'Ucapkan KER.');
  await record('Rekam video TAS');
  await record('Rekam video kata lengkap');
  await fireEvent.press(screen.getByLabelText('Simpan Kata'));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  expect(mockSave.mock.calls[0][2].syllables.map((p: { text: string }) => p.text)).toEqual(['TAS', 'KER']);
  expect(mockSave.mock.calls[0][2].syllables[1].localUri).toBe('synthetic-clip-1');
});

it('retains the local recording and prepared draft revision when upload fails', async () => {
  mockSave.mockImplementation(async (_api, _owner, form, _status, _limits, prepared) => {
    prepared({ ...word, id: form.id, revision: 7, syllables: [] });
    throw new ApiError('network', 'Kata belum siap digunakan karena rekaman belum berhasil dikirim.');
  });
  await start();
  await record('Rekam video kata lengkap');
  await fireEvent.press(screen.getByLabelText('Simpan Kata'));
  await waitFor(() => expect(screen.getByLabelText('Kata belum siap digunakan karena rekaman belum berhasil dikirim.')).toBeTruthy());
  expect(screen.getByText('Preview synthetic-clip-1')).toBeTruthy();
  expect(mockLocalDelete).not.toHaveBeenCalledWith('synthetic-clip-1');
  await fireEvent.press(screen.getByLabelText('Simpan Kata'));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  expect(mockSave.mock.calls[1][2]).toMatchObject({ isNew: false, revision: 7, localUri: 'synthetic-clip-1' });
});

it('allows cancellation when permission is denied, without saving or uploading', async () => {
  await start();
  mockPermission = false;
  await fireEvent.press(screen.getByLabelText('Rekam video kata lengkap'));
  expect(screen.getByText('Izin kamera dan mikrofon ditolak')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Batal merekam'));
  expect(screen.getByLabelText('Kata lengkap')).toHaveProp('value', 'KERTAS');
  expect(mockSave).not.toHaveBeenCalled();
});

it('discards a cancelled recording and keeps the previous form video', async () => {
  await start();
  await record('Rekam video kata lengkap');
  await fireEvent.press(screen.getByLabelText('Rekam video kata lengkap'));
  await fireEvent.press(screen.getByLabelText('Ambil rekaman uji'));
  await fireEvent.press(screen.getByLabelText('Batal merekam'));
  expect(screen.getByText('Preview synthetic-clip-1')).toBeTruthy();
  expect(mockLocalDelete).toHaveBeenCalledWith('synthetic-clip-2');
  expect(mockLocalDelete).not.toHaveBeenCalledWith('synthetic-clip-1');
});

it('confirms deletion before requesting database and Storage cleanup', async () => {
  mockList.mockResolvedValue({ words: [{ ...word, syllable_count: 2 }], max_upload_mb: 50, max_duration_s: 120 });
  const confirm = jest.spyOn(Alert, 'alert');
  await render(<ManualWords ownerId={UID} onClose={mockClose} />);
  await waitFor(() => expect(screen.getByLabelText('Hapus KERTAS')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Hapus KERTAS'));
  expect(mockDelete).not.toHaveBeenCalled();
  const actions = confirm.mock.calls[0][2]!;
  await act(async () => { actions.find((action) => action.text === 'Hapus kata')!.onPress!(); });
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(word.id, word.revision, 'fixture-token'));
});

it('cleans unused local camera files when the editor unmounts', async () => {
  await start();
  await record('Rekam video kata lengkap');
  await cleanup();
  expect(mockLocalDelete).toHaveBeenCalledWith('synthetic-clip-1');
});

it('shows a migration dependency without presenting a working save form', async () => {
  mockList.mockRejectedValue(new ApiError('http', 'fixture', 503, 'SCHEMA_MIGRATION_REQUIRED'));
  await render(<ManualWords ownerId={UID} onClose={mockClose} />);
  await waitFor(() => expect(screen.getByLabelText('Fitur kata manual menunggu migrasi database. Hubungi pengelola, lalu coba lagi.')).toBeTruthy());
  expect(screen.getByLabelText('Tambah kata')).toBeDisabled();
  expect(mockSave).not.toHaveBeenCalled();
});
