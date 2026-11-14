import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CompanionLogin } from '../src/auth/CompanionLogin';
import { CompanionPinGate } from '../src/auth/CompanionPinGate';

const mockLogin = jest.fn();
const mockHasPin = jest.fn();
const mockSavePin = jest.fn();
const mockCreated = jest.fn();
jest.mock('../src/auth/companion', () => ({ loginCompanion: (...args: unknown[]) => mockLogin(...args) }));
jest.mock('../src/user/storage', () => ({ hasPin: () => mockHasPin(), savePin: (pin: string) => mockSavePin(pin) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLogin.mockReset().mockResolvedValue({});
  mockHasPin.mockReset().mockResolvedValue(false);
  mockSavePin.mockReset().mockResolvedValue(undefined);
});

it('requires credentials, masks the password and calls the existing login logic', async () => {
  await render(<CompanionLogin />);
  expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Email pendamping'), 'companion@example.test');
  await fireEvent.changeText(screen.getByLabelText('Password pendamping'), 'fixture-password');
  expect(screen.getByLabelText('Password pendamping').props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('companion@example.test', 'fixture-password'));
  expect(screen.getByLabelText('Password pendamping').props.value).toBe('');
});

it('shows login failure without losing the retry action', async () => {
  mockLogin.mockRejectedValueOnce(new Error('Login gagal.'));
  await render(<CompanionLogin />);
  await fireEvent.changeText(screen.getByLabelText('Email pendamping'), 'companion@example.test');
  await fireEvent.changeText(screen.getByLabelText('Password pendamping'), 'fixture-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(screen.getByLabelText('Login gagal.')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
});

const gate = () => <CompanionPinGate onCreated={mockCreated}><Text>PIN verification screen</Text></CompanionPinGate>;

it('requires a matching four-digit new PIN before saving', async () => {
  await render(gate());
  await waitFor(() => expect(screen.getByText('Buat PIN pendamping')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('PIN baru, 4 angka'), '48x21');
  expect(screen.getByLabelText('PIN baru, 4 angka').props.value).toBe('4821');
  await fireEvent.changeText(screen.getByLabelText('Ulangi PIN baru'), '4822');
  expect(screen.getByRole('button', { name: 'Simpan PIN baru' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Ulangi PIN baru'), '4821');
  await fireEvent.press(screen.getByRole('button', { name: 'Simpan PIN baru' }));
  await waitFor(() => expect(mockCreated).toHaveBeenCalledTimes(1));
  expect(mockSavePin).toHaveBeenCalledWith('4821');
});

it('preserves existing PIN protection and does not offer overwrite', async () => {
  mockHasPin.mockResolvedValue(true);
  await render(gate());
  await waitFor(() => expect(screen.getByText('PIN verification screen')).toBeTruthy());
  expect(screen.queryByText('Buat PIN pendamping')).toBeNull();
  expect(mockSavePin).not.toHaveBeenCalled();
  expect(mockCreated).not.toHaveBeenCalled();
});

it('fails closed if reading SecureStore fails and permits retry', async () => {
  mockHasPin.mockRejectedValueOnce(new Error('Keystore unavailable'));
  await render(gate());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Periksa PIN lagi' })).toBeTruthy());
  expect(screen.queryByLabelText('PIN baru, 4 angka')).toBeNull();
  expect(screen.queryByText('PIN verification screen')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Periksa PIN lagi' }));
  await waitFor(() => expect(screen.getByText('Buat PIN pendamping')).toBeTruthy());
});

it('does not open companion access if PIN storage fails', async () => {
  mockSavePin.mockRejectedValueOnce(new Error('Keystore unavailable'));
  await render(gate());
  await waitFor(() => expect(screen.getByText('Buat PIN pendamping')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('PIN baru, 4 angka'), '4821');
  await fireEvent.changeText(screen.getByLabelText('Ulangi PIN baru'), '4821');
  await fireEvent.press(screen.getByRole('button', { name: 'Simpan PIN baru' }));
  await waitFor(() => expect(screen.getByLabelText(/PIN belum berhasil disimpan/)).toBeTruthy());
  expect(mockCreated).not.toHaveBeenCalled();
});

it('ignores late save results after leaving the account screen', async () => {
  let finish!: () => void;
  mockSavePin.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  const view = await render(gate());
  await waitFor(() => expect(screen.getByText('Buat PIN pendamping')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('PIN baru, 4 angka'), '4821');
  await fireEvent.changeText(screen.getByLabelText('Ulangi PIN baru'), '4821');
  await fireEvent.press(screen.getByRole('button', { name: 'Simpan PIN baru' }));
  await view.unmount();
  await act(async () => finish());
  expect(mockCreated).not.toHaveBeenCalled();
});
