import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import TutorialVideos from '../app/tutorial-videos';
import manifest from '../../server/app/content/tutorials.json';

const mockApi = { getTutorials: jest.fn().mockResolvedValue({
  items: manifest.map((item) => ({ ...item, present: false })), max_duration_s: 120, max_upload_mb: 50,
}) };
const mockDelete = jest.fn();

jest.mock('../src/state/user', () => ({ useUser: () => ({ session: { user: { id: 'synthetic-producer' } } }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('../src/auth/companion', () => ({ getCompanionSession: async () => ({ access_token: 'fixture-token' }) }));
jest.mock('../src/recording/localFile', () => ({ deleteLocalFile: (uri: string) => mockDelete(uri) }));
jest.mock('../src/recording/RecordPanel', () => ({ RecordPanel: ({ onRecorded }: { onRecorded: (uri: string) => void }) => {
  const { Pressable, Text: NativeText } = require('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => onRecorded('synthetic-clip')}>
    <NativeText>Rekam sintetis</NativeText>
  </Pressable>;
} }));
jest.mock('../src/recording/ClipPreview', () => ({ ClipPreview: () => null }));

it('renders the authenticated tutorial screen inside the actual Expo Router navigator', async () => {
  await renderRouter({ index: TutorialVideos });
  await waitFor(() => expect(screen.getByText('0 dari 24 video tersimpan di Storage.')).toBeTruthy());
  expect(screen.getByText('Rekam Tutorial')).toBeTruthy();
});

it('blocks native back with an unsaved clip and resumes navigation only after confirmed discard', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    const view = await renderRouter({ index: () => <Text>Beranda sintetis</Text>, 'tutorial-videos': TutorialVideos });
    await act(async () => router.push('/tutorial-videos'));
    await waitFor(() => expect(screen.getByText('0 dari 24 video tersimpan di Storage.')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('TOLONG, TO, belum direkam'));
    await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
    await act(async () => router.back());
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(view.getPathname()).toBe('/tutorial-videos');
    const buttons = alert.mock.calls[0][2]!;
    expect(buttons[0].style).toBe('cancel');
    expect(mockDelete).not.toHaveBeenCalledWith('synthetic-clip');
    await act(async () => buttons.find((button) => button.text === 'Keluar')!.onPress!());
    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(mockDelete).toHaveBeenCalledWith('synthetic-clip');
  } finally {
    alert.mockRestore();
  }
});
