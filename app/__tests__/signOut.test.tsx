import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SignOutScreen, { SignOutConfirm } from '../app/(tabs)/settings/sign-out';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSignOut = jest.fn();
const mockLock = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }));
jest.mock('../src/auth/session', () => ({ auth: { signOut: (...a: unknown[]) => mockSignOut(...a) } }));
jest.mock('../src/pin/PinSession', () => ({ usePinSession: () => ({ lock: mockLock, touch: jest.fn() }) }));
// The real gate is tested in pin.test.tsx; here only that Keluar sits behind it.
jest.mock('../src/pin/PinGate', () => {
  const { Text } = require('react-native');
  return { PinGate: () => <Text>pin-gate</Text> };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

it('asks the companion PIN before the confirmation', async () => {
  await render(<SignOutScreen />);
  expect(screen.getByText('pin-gate')).toBeTruthy();
  expect(screen.queryByText('Keluar dari akun?')).toBeNull();
});

it('signs out only after the confirmation, then goes to Masuk and locks the PIN session', async () => {
  await render(<SignOutConfirm />);
  expect(screen.getByText('Keluar dari akun?')).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(mockLock).toHaveBeenCalled();
});

it('Batal goes back without signing out', async () => {
  await render(<SignOutConfirm />);
  await fireEvent.press(screen.getByTestId('confirm-cancel'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockSignOut).not.toHaveBeenCalled();
});

it('still leaves when the server cannot be reached', async () => {
  mockSignOut.mockRejectedValue(new Error('Network request failed'));
  await render(<SignOutConfirm />);
  await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'));
});
