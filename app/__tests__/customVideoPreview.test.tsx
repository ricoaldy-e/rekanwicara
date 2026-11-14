import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { VideoPreview } from '../src/customWords/VideoPreview';
import { contractV2 } from '../test-fixtures/api-v2-contract';

const mockSign = jest.fn();
const mockListener = jest.fn();
const mockRemove = jest.fn();
jest.mock('../src/customWords/service', () => ({ signedVideo: (...args: unknown[]) => mockSign(...args), manualError: () => 'Video belum dapat dibuka.' }));
jest.mock('expo-video', () => {
  const { Text } = require('react-native');
  const player = { addListener: (_name: string, callback: unknown) => { mockListener(callback); return { remove: mockRemove }; } };
  return { useVideoPlayer: () => player, VideoView: () => <Text>Video tersimpan</Text> };
});
jest.mock('../src/recording/ClipPreview', () => {
  const { Text } = require('react-native');
  return { ClipPreview: () => <Text>Video lokal</Text> };
});

beforeEach(() => { jest.clearAllMocks(); mockSign.mockResolvedValue('fixture-signed-url'); });

it('renews signed access and remounts playback after an expired URL error', async () => {
  const video = { ...contractV2.manualWord.video, available: true };
  await render(<VideoPreview video={video} ownerId="fixture-owner" localUri={null} />);
  await fireEvent.press(screen.getByLabelText('Preview video tersimpan'));
  await waitFor(() => expect(screen.getByText('Video tersimpan')).toBeTruthy());
  await act(async () => { mockListener.mock.calls.at(-1)![0]({ status: 'error' }); });
  expect(screen.getByLabelText('Video belum dapat diputar atau aksesnya kedaluwarsa. Perbarui akses video.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Perbarui akses video'));
  await waitFor(() => expect(mockSign).toHaveBeenCalledTimes(2));
  expect(mockRemove).toHaveBeenCalled();
});

it('does not request a signed URL for a missing video', async () => {
  await render(<VideoPreview video={contractV2.manualWord.video} ownerId="fixture-owner" localUri={null} />);
  expect(screen.getByLabelText('Video belum tersedia di Storage. Rekam video lalu simpan kembali.')).toBeTruthy();
  expect(mockSign).not.toHaveBeenCalled();
});
