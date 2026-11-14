import { router } from 'expo-router';
import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { useHomeRecords } from '../src/home/useHomeRecords';

const mockLoad = jest.fn();
const names = new Map<string, string>();
jest.mock('../src/home/records', () => ({ HomeSessionError: class extends Error {}, loadHomeRecords: () => mockLoad() }));

function Consumer() {
  const { state } = useHomeRecords('11111111-1111-4111-8111-111111111111', names);
  return <Text>{state.data?.progress.map((item) => item.itemId).join(',') || state.status}</Text>;
}

it('refreshes personal records when returning from another route using actual Expo focus events', async () => {
  mockLoad.mockResolvedValue({ progress: [], activities: [] });
  await renderRouter({ index: Consumer, calibration: () => <Text>Latihan sintetis</Text> });
  await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
  expect(mockLoad).toHaveBeenCalledTimes(1);
  await act(async () => router.push('/calibration'));
  mockLoad.mockResolvedValue({ progress: [{ itemId: 'updated-after-practice', passed: true, stage: 'lulus' }], activities: [] });
  await act(async () => router.back());
  await waitFor(() => expect(screen.getByText('updated-after-practice')).toBeTruthy());
  expect(mockLoad).toHaveBeenCalledTimes(2);
});
