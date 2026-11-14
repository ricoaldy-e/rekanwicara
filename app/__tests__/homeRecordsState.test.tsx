import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { HomeSessionError } from '../src/home/records';
import { useHomeRecords, type HomeRecords } from '../src/home/useHomeRecords';

const mockLoad = jest.fn();
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const names = new Map<string, string>();
const empty: HomeRecords = { progress: [], activities: [] };
const oldAccount: HomeRecords = { progress: [{ itemId: 'private-old-account', passed: true, stage: 'lulus' }], activities: [] };

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]) };
});
jest.mock('../src/home/records', () => ({
  HomeSessionError: class extends Error {},
  loadHomeRecords: (...args: unknown[]) => mockLoad(...args),
}));

beforeEach(() => { mockLoad.mockReset().mockResolvedValue(empty); });

const render = (uid: string | null = UID) => renderHook(({ owner }: { owner: string | null }) => useHomeRecords(owner, names), { initialProps: { owner: uid } });

it('does not load personal data while signed out', async () => {
  const view = await render(null);
  expect(view.result.current.state).toEqual({ status: 'signed_out', data: null });
  expect(mockLoad).not.toHaveBeenCalled();
});

it('exposes loading, then empty data for a new account', async () => {
  let finish!: (data: HomeRecords) => void;
  mockLoad.mockReturnValueOnce(new Promise<HomeRecords>((resolve) => { finish = resolve; }));
  const view = await render();
  expect(view.result.current.state).toEqual({ status: 'loading', data: null });
  await act(async () => finish(empty));
  expect(view.result.current.state).toEqual({ status: 'ready', data: empty });
});

it('supports retry after a failed initial load', async () => {
  mockLoad.mockRejectedValueOnce(new Error('synthetic-network-error'));
  const view = await render();
  await waitFor(() => expect(view.result.current.state.status).toBe('error'));
  await act(async () => view.result.current.refresh());
  await waitFor(() => expect(view.result.current.state).toEqual({ status: 'ready', data: empty }));
});

it('signals session expiry without retaining personal data', async () => {
  mockLoad.mockRejectedValueOnce(new HomeSessionError());
  const view = await render();
  await waitFor(() => expect(view.result.current.state).toMatchObject({ status: 'error', data: null, sessionExpired: true }));
});

it('hides previous-account data immediately during account switch and logout', async () => {
  mockLoad.mockResolvedValueOnce(oldAccount).mockReturnValueOnce(new Promise(() => {}));
  const view = await render();
  await waitFor(() => expect(view.result.current.state).toEqual({ status: 'ready', data: oldAccount }));
  await view.rerender({ owner: OTHER });
  expect(view.result.current.state).toEqual({ status: 'loading', data: null });
  await view.rerender({ owner: null });
  expect(view.result.current.state).toEqual({ status: 'signed_out', data: null });
});

it('ignores an old-account response that arrives after the new account has loaded', async () => {
  let finish!: (data: HomeRecords) => void;
  mockLoad.mockReturnValueOnce(new Promise<HomeRecords>((resolve) => { finish = resolve; })).mockResolvedValueOnce(empty);
  const view = await render();
  await view.rerender({ owner: OTHER });
  await waitFor(() => expect(view.result.current.state).toEqual({ status: 'ready', data: empty }));
  await act(async () => finish(oldAccount));
  expect(view.result.current.state).toEqual({ status: 'ready', data: empty });
});

it('refreshes when the app comes back to the foreground', async () => {
  const subscribe = jest.spyOn(AppState, 'addEventListener');
  subscribe.mockClear();
  try {
    const view = await render();
    await waitFor(() => expect(view.result.current.state.status).toBe('ready'));
    const listener = subscribe.mock.calls.find(([event]) => event === 'change')![1];
    await act(async () => listener('active'));
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
  } finally {
    subscribe.mockRestore();
  }
});
