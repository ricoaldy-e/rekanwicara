import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Settings from '../app/(tabs)/settings';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockLock = jest.fn();
const mockUpdate = jest.fn();
let mockSession: { uid: string } | null = { uid: 'u1' };
let mockVibration = true;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ session: mockSession }) }));
jest.mock('../src/auth/session', () => ({ auth: { signOut: (...a: unknown[]) => mockSignOut(...a) } }));
jest.mock('../src/pin/PinSession', () => ({ usePinSession: () => ({ lock: mockLock }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({ health: null }) }));
jest.mock('../src/state/settings', () => ({
  useSettings: () => ({ apiUrl: 'http://192.168.1.10:8000', envApiUrl: 'http://x', isOverridden: false, setApiUrl: jest.fn(), resetApiUrl: jest.fn() }),
}));
jest.mock('../src/state/user', () => ({
  useUser: () => ({
    demo: false, setDemo: jest.fn(), sync: { running: false }, ready: true,
    profile: { settings: { vibration: mockVibration } }, updateSettings: mockUpdate,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { uid: 'u1' };
  mockVibration = true;
  mockSignOut.mockResolvedValue(undefined);
});

it('lists vibration, motion note, PIN, About and sign-out before the operator options', async () => {
  await render(<Settings />);
  const text = JSON.stringify(screen.toJSON());
  const order = ['Getar', 'Gerak mengikuti pengaturan HP.', 'Ganti PIN', 'Tentang aplikasi', 'Keluar', 'Untuk operator demo'].map((t) => text.indexOf(t));
  expect(order.every((i) => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(screen.getByTestId('settings-url').props.value).toBe('http://192.168.1.10:8000');
  expect(screen.getByTestId('demo-toggle')).toBeTruthy();
});

it('the vibration switch changes the setting and its state is written out', async () => {
  await render(<Settings />);
  expect(screen.getByTestId('vibration-state')).toHaveTextContent('Aktif');
  await fireEvent(screen.getByTestId('vibration-toggle'), 'valueChange', false);
  expect(mockUpdate).toHaveBeenCalledWith({ vibration: false });
});

it('shows "Mati" when vibration is off', async () => {
  mockVibration = false;
  await render(<Settings />);
  expect(screen.getByTestId('vibration-state')).toHaveTextContent('Mati');
});

it('opens Ganti PIN and Tentang', async () => {
  await render(<Settings />);
  await fireEvent.press(screen.getByTestId('change-pin-link'));
  expect(mockPush).toHaveBeenLastCalledWith('/settings/change-pin');
  await fireEvent.press(screen.getByTestId('about-link'));
  expect(mockPush).toHaveBeenLastCalledWith('/about');
});

it('signs out only after the confirmation, then goes to Masuk and locks the PIN session', async () => {
  await render(<Settings />);
  await fireEvent.press(screen.getByTestId('sign-out'));
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(screen.getByText('Keluar dari akun?')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(mockLock).toHaveBeenCalled();
});

it('cancel does nothing', async () => {
  await render(<Settings />);
  await fireEvent.press(screen.getByTestId('sign-out'));
  await fireEvent.press(screen.getByTestId('confirm-cancel'));
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.queryByText('Keluar dari akun?')).toBeNull();
});

it('still leaves when the server cannot be reached', async () => {
  mockSignOut.mockRejectedValue(new Error('Network request failed'));
  await render(<Settings />);
  await fireEvent.press(screen.getByTestId('sign-out'));
  await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'));
});

it('has no sign-out button without an account session', async () => {
  mockSession = null;
  await render(<Settings />);
  expect(screen.queryByTestId('sign-out')).toBeNull();
});

it('uses no clinical wording and does not call the PIN security', async () => {
  await render(<Settings />);
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis|terapi|aman|keamanan)\b/i);
});
