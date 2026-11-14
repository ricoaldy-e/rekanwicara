import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TutorialVideo } from '../src/practice/TutorialVideo';
import type { VideoReference } from '../src/api/types';

const UID = '11111111-1111-4111-8111-111111111111';
const mockSign = jest.fn();
const mockBucket = jest.fn();
const mockPlay = jest.fn();
const mockSession = jest.fn();
jest.mock('../src/auth/companion', () => ({ getCompanionSession: () => mockSession() }));
jest.mock('../src/data/supabase', () => ({ getClient: () => ({ storage: { from: mockBucket } }) }));
jest.mock('expo-video', () => ({
  useVideoPlayer: (_uri: string, initialize: (player: unknown) => void) => {
    const player = { loop: false, play: mockPlay, addListener: () => ({ remove: jest.fn() }) };
    initialize(player);
    return player;
  },
  VideoView: () => { const { Text } = require('react-native'); return <Text>Video sedang diputar</Text>; },
}));
const video: VideoReference = { bucket: 'rekan-wicara-tutorials', path: 'default/level-1/e.mp4', position: 1, available: true };
beforeEach(() => {
  jest.clearAllMocks();
  mockBucket.mockReturnValue({ createSignedUrl: mockSign });
  mockSign.mockResolvedValue({ data: { signedUrl: 'https://example.test/signed-test' }, error: null });
  mockSession.mockResolvedValue({ user: { id: UID } });
});
it('requests the exact material path only when playback is selected', async () => {
  await render(<TutorialVideo video={video} ownerId={UID} />);
  expect(mockSign).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Putar video contoh' }));
  await waitFor(() => expect(screen.getByText('Video sedang diputar')).toBeTruthy());
  expect(mockBucket).toHaveBeenCalledWith('rekan-wicara-tutorials');
  expect(mockSign).toHaveBeenCalledWith('default/level-1/e.mp4', 300);
  expect(mockPlay).toHaveBeenCalled();
});
it('does not sign a missing video or substitute another material', async () => {
  await render(<TutorialVideo video={{ ...video, available: false }} ownerId={UID} />);
  expect(screen.getByLabelText(/Video contoh belum tersedia/)).toBeTruthy();
  expect(mockSign).not.toHaveBeenCalled();
});
it('does not open video after the account changes', async () => {
  mockSession.mockResolvedValue({ user: { id: 'different-account' } });
  await render(<TutorialVideo video={video} ownerId={UID} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Putar video contoh' }));
  await waitFor(() => expect(screen.getByLabelText(/Video belum dapat dibuka/)).toBeTruthy());
  expect(mockSign).not.toHaveBeenCalled();
});
