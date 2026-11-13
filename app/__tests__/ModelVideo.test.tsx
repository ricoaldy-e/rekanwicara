import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { VideoPlayerStatus } from 'expo-video';

import type { PracticeItem } from '../src/data/types';
import { ModelVideo } from '../src/practice/ModelVideo';

type StatusEvent = { status: VideoPlayerStatus; error?: { message: string } };
interface MockPlayer {
  status: VideoPlayerStatus;
  loop: boolean;
  muted?: boolean;
  play: jest.Mock;
  release: jest.Mock;
  listeners: Set<(event: StatusEvent) => void>;
  addListener(name: string, listener: (event: StatusEvent) => void): { remove(): void };
}

const mockHasVideo = jest.fn();
const mockApi = { baseUrl: 'http://example.test', hasModelVideo: mockHasVideo };
const mockPlayers: MockPlayer[] = [];
let mockInitialStatus: VideoPlayerStatus = 'loading';
const item: PracticeItem = { key: 'l1_a', itemId: 'l1_a', level: 1, text: 'a', instruction: 'Buka mulut lebar dan ucapkan A.', source: 'default' };

function mockCreatePlayer(): MockPlayer {
  const listeners = new Set<(event: StatusEvent) => void>();
  const player: MockPlayer = {
    status: mockInitialStatus, loop: false, play: jest.fn(), release: jest.fn(), listeners,
    addListener: (_name, listener) => {
      listeners.add(listener);
      return { remove: () => { listeners.delete(listener); } };
    },
  };
  mockPlayers.push(player);
  return player;
}

jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('expo', () => jest.requireActual('expo/src/hooks/useEvent'));
jest.mock('expo-video', () => {
  const { useEffect, useState } = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: (_url: string, setup: (player: MockPlayer) => void) => {
      const [player] = useState(() => {
        const value = mockCreatePlayer();
        setup(value);
        return value;
      }) as [MockPlayer];
      useEffect(() => () => player.release(), [player]);
      return player;
    },
    VideoView: () => <View testID="synthetic-video" />,
  };
});

beforeEach(() => {
  mockHasVideo.mockReset().mockResolvedValue(true);
  mockPlayers.length = 0;
  mockInitialStatus = 'loading';
});

async function statusChange(status: VideoPlayerStatus) {
  const player = mockPlayers[mockPlayers.length - 1];
  player.status = status;
  await act(async () => {
    for (const listener of [...player.listeners]) listener({ status, error: { message: 'Synthetic decoder detail' } });
  });
}

it('shows loading during the check and native buffering, then plays and cleans up on unmount', async () => {
  let finish!: (exists: boolean) => void;
  mockHasVideo.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
  const view = await render(<ModelVideo item={item} />);
  expect(screen.getByLabelText('Memuat video contoh')).toBeTruthy();
  expect(mockPlayers).toHaveLength(0);

  await act(async () => finish(true));
  expect(screen.getByLabelText('Memuat video contoh')).toBeTruthy();
  await statusChange('readyToPlay');
  expect(screen.queryByLabelText('Memuat video contoh')).toBeNull();
  expect(screen.getByTestId('synthetic-video')).toBeTruthy();
  expect(mockPlayers[0].loop).toBe(true);
  expect(mockPlayers[0].muted).toBe(true);
  expect(screen.getByTestId('model-instruction')).toHaveTextContent('Buka mulut lebar dan ucapkan A.');
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(mockPlayers[0].listeners.size).toBe(0);
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
});

it.each(['loading', 'readyToPlay'] as const)('falls back when playback fails from %s', async (status) => {
  await render(<ModelVideo item={item} />);
  if (status === 'readyToPlay') await statusChange(status);
  await statusChange('error');
  expect(screen.getByTestId('model-video-error')).toBeTruthy();
  expect(screen.getByTestId('model-fallback')).toBeTruthy();
  expect(screen.getByLabelText('Ucapkan a')).toBeTruthy();
  expect(screen.getByRole('image', { name: 'Mulut terbuka lebar untuk bunyi a' })).toBeTruthy();
  expect(screen.queryByTestId('synthetic-video')).toBeNull();
  expect(screen.queryByText('Synthetic decoder detail')).toBeNull();
  expect(mockPlayers[0].listeners.size).toBe(0);
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
  expect(mockHasVideo).toHaveBeenCalledTimes(1);
});

it('handles a player already in error before the listener is attached', async () => {
  mockInitialStatus = 'error';
  await render(<ModelVideo item={item} />);
  expect(screen.getByTestId('model-video-error')).toBeTruthy();
  expect(screen.getByTestId('model-fallback')).toBeTruthy();
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
});

it.each(['missing', 'network'] as const)('uses illustrations and offers retry when the check reports %s', async (condition) => {
  if (condition === 'missing') mockHasVideo.mockResolvedValueOnce(false);
  else mockHasVideo.mockRejectedValueOnce(new Error('Synthetic transport detail'));
  await render(<ModelVideo item={item} />);
  expect(screen.getByTestId('model-fallback')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Coba muat video lagi' })).toBeTruthy();
  expect(screen.queryByText('Synthetic transport detail')).toBeNull();
  expect(mockPlayers).toHaveLength(0);
});

it('rechecks on retry and creates a fresh player after releasing the failed one', async () => {
  await render(<ModelVideo item={item} />);
  await statusChange('error');
  let finish!: (exists: boolean) => void;
  mockHasVideo.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Coba muat video lagi' }));
  expect(screen.getByLabelText('Memuat video contoh')).toBeTruthy();
  expect(mockHasVideo).toHaveBeenCalledTimes(2);
  expect(mockPlayers).toHaveLength(1);

  await act(async () => finish(true));
  expect(mockPlayers).toHaveLength(2);
  await statusChange('readyToPlay');
  expect(screen.getByTestId('synthetic-video')).toBeTruthy();
  expect(screen.queryByTestId('model-fallback')).toBeNull();
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
  expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
});

it('ignores a completed availability check after unmount', async () => {
  let finish!: (exists: boolean) => void;
  mockHasVideo.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
  const view = await render(<ModelVideo item={item} />);
  await view.unmount();
  await act(async () => finish(true));
  expect(mockPlayers).toHaveLength(0);
});

it('shows text only, without a video check, when not analysing with v1', async () => {
  await render(<ModelVideo item={item} source="mock" />);
  expect(mockHasVideo).not.toHaveBeenCalled();
  expect(screen.getByTestId('model-video-missing')).toBeTruthy();
  expect(screen.getByTestId('model-instruction')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Coba muat video lagi' })).toBeNull();
});

it('labels an AI-written instruction', async () => {
  await render(<ModelVideo item={{ ...item, instructionSource: 'ai' }} source="mock" />);
  expect(screen.getByText('Instruksi dibuat dengan bantuan AI')).toBeTruthy();
});
