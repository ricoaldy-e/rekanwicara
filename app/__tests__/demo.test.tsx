import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import type { Item } from '../src/api/types';
import { UserProvider, useUser } from '../src/state/user';
import { buildProgress } from '../src/state/progression';
import { createDemoProfile } from '../src/user/demo';
import { newProfile, parseProfile } from '../src/user/pure';

const mockSave = jest.fn();
const mockSavePin = jest.fn();
const mockEnsureUser = jest.fn().mockResolvedValue('11111111-1111-4111-8111-111111111111');
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockPersonal = { ...newProfile(), onboarded: true, calibrated: true };
let mockLoadedProfile = mockPersonal;
const mockItems: Item[] = [
  { item_id: 'l1_a', level: 1, text: 'a', units: ['a'], priority: 'required', emoji: null, active: true },
  { item_id: 'l2_ma', level: 2, text: 'ma', units: ['ma'], priority: 'required', emoji: null, active: true },
  { item_id: 'l3_mama', level: 3, text: 'mama', units: ['ma', 'ma'], priority: 'required', emoji: null, active: true },
];
jest.mock('../src/state/content', () => ({ useContent: () => ({ items: mockItems }) }));
jest.mock('../src/user/storage', () => ({
  loadProfile: async () => mockLoadedProfile,
  saveProfile: (...args: unknown[]) => mockSave(...args),
  savePin: (...args: unknown[]) => mockSavePin(...args),
}));
jest.mock('../src/data/supabase', () => ({ createRemote: () => ({
  ensureUser: () => mockEnsureUser(), upsert: (...args: unknown[]) => mockUpsert(...args),
}) }));

function Controls() {
  const user = useUser();
  return <>
    <Text testID="ready">{String(user.ready)}</Text>
    <Text testID="profile">{user.profile.userId}</Text>
    <Text testID="demo">{String(user.demo)}</Text>
    <Text testID="count">{user.profile.listenChecks.length}</Text>
    <Text testID="attempts">{user.profile.attempts.length}</Text>
    <Pressable testID="on" onPress={() => user.setDemo(true)} />
    <Pressable testID="off" onPress={() => user.setDemo(false)} />
    <Pressable testID="check" onPress={() => user.addListenCheck('l3_mama', 'jelas')} />
    <Pressable testID="attempt" onPress={() => user.addAttempt({ ...user.profile.attempts[0], synced: false })} />
    <Pressable testID="sync" onPress={() => void user.syncNow()} />
    <Pressable testID="pin" onPress={() => void user.completeOnboarding('9999')} />
  </>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadedProfile = mockPersonal;
});

it('seeds passed materials through the real progression rules without claiming calibration', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const profile = createDemoProfile(now);
  expect(parseProfile(JSON.stringify(profile))).toEqual(profile);
  expect(profile.calibrated).toBe(false);
  const progress = buildProgress(mockItems, profile.attempts, [], profile.settings, now);
  expect(progress.get('l1_a')?.stage).toBe('lulus');
  expect(progress.get('l2_ma')?.stage).toBe('lulus');
  expect(progress.get('l3_mama')?.locked).toBe(false);
});

it('never persists or syncs demo data and restores the personal profile on exit', async () => {
  const view = await render(<UserProvider><Controls /></UserProvider>);
  await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
  await fireEvent.press(screen.getByTestId('on'));
  expect(screen.getByTestId('profile')).not.toHaveTextContent(mockPersonal.userId);
  // Initial personal sync may save its bookkeeping; measure isolation after entering demo.
  mockSave.mockClear();
  await fireEvent.press(screen.getByTestId('check'));
  await fireEvent.press(screen.getByTestId('attempt'));
  await fireEvent.press(screen.getByTestId('sync'));
  await fireEvent.press(screen.getByTestId('pin'));
  expect(screen.getByTestId('count')).toHaveTextContent('1');
  expect(screen.getByTestId('attempts')).toHaveTextContent('21');
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockSavePin).not.toHaveBeenCalled();
  expect(mockEnsureUser).not.toHaveBeenCalled();
  expect(mockUpsert).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('off'));
  expect(screen.getByTestId('profile')).toHaveTextContent(mockPersonal.userId);
  expect(screen.getByTestId('count')).toHaveTextContent('0');
  await fireEvent.press(screen.getByTestId('check'));
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ userId: mockPersonal.userId }));
  await act(async () => {});
  await view.unmount();
  await render(<UserProvider><Controls /></UserProvider>);
  await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
  expect(screen.getByTestId('demo')).toHaveTextContent('false');
  expect(screen.getByTestId('profile')).toHaveTextContent(mockPersonal.userId);
});

it('keeps the personal profile active until an in-flight sync has finished', async () => {
  let finish!: (uid: string) => void;
  mockLoadedProfile = { ...mockPersonal, listenChecks: [{
    id: '11111111-1111-4111-8111-111111111112', itemId: 'l3_mama', result: 'jelas',
    at: new Date().toISOString(), synced: false,
  }] };
  mockEnsureUser.mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }));
  await render(<UserProvider><Controls /></UserProvider>);
  await waitFor(() => expect(mockEnsureUser).toHaveBeenCalled());
  await fireEvent.press(screen.getByTestId('on'));
  expect(screen.getByTestId('demo')).toHaveTextContent('false');
  await act(async () => finish('11111111-1111-4111-8111-111111111111'));
  await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
  await fireEvent.press(screen.getByTestId('on'));
  expect(screen.getByTestId('demo')).toHaveTextContent('true');
});
