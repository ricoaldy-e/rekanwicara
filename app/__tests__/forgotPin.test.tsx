import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ForgotPin from '../app/auth/forgot-pin';
import { AuthFailure } from '../src/auth/errors';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSignIn = jest.fn();
let mockSession: { email: string } | null = { email: 'rico@email.com' };

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ session: mockSession }) }));
jest.mock('../src/auth/session', () => ({ auth: { signIn: (...a: unknown[]) => mockSignIn(...a) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { email: 'rico@email.com' };
});

it('asks for the account password and, when right, goes on to make a new PIN', async () => {
  mockSignIn.mockResolvedValue({ uid: 'u1' });
  await render(<ForgotPin />);
  await fireEvent.changeText(screen.getByTestId('password'), 'abcdefg1');
  await fireEvent.press(screen.getByTestId('forgot-pin-submit'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/create-pin'));
  expect(mockSignIn).toHaveBeenCalledWith({ email: 'rico@email.com', password: 'abcdefg1' });
});

it('does not call the server with an empty password', async () => {
  await render(<ForgotPin />);
  await fireEvent.press(screen.getByTestId('forgot-pin-submit'));
  expect(screen.getByTestId('password-error')).toHaveAccessibleName('Isi kata sandi.');
  expect(mockSignIn).not.toHaveBeenCalled();
});

it('a wrong password shows a plain message and does not continue', async () => {
  mockSignIn.mockRejectedValue(new AuthFailure('INVALID_CREDENTIALS'));
  await render(<ForgotPin />);
  await fireEvent.changeText(screen.getByTestId('password'), 'salahsalah1');
  await fireEvent.press(screen.getByTestId('forgot-pin-submit'));
  await waitFor(() => expect(screen.getByTestId('password-error')).toHaveAccessibleName('Kata sandi salah.'));
  expect(mockReplace).not.toHaveBeenCalled();
});

it('no connection shows a banner with "Coba lagi" and keeps the password typed', async () => {
  mockSignIn.mockRejectedValueOnce(new AuthFailure('NETWORK')).mockResolvedValueOnce({ uid: 'u1' });
  await render(<ForgotPin />);
  await fireEvent.changeText(screen.getByTestId('password'), 'abcdefg1');
  await fireEvent.press(screen.getByTestId('forgot-pin-submit'));
  await waitFor(() => expect(screen.getByTestId('forgot-pin-banner')).toBeTruthy());
  expect(screen.getByTestId('password').props.value).toBe('abcdefg1');
  await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/create-pin'));
});

it('without an account it says so and offers no password field', async () => {
  mockSession = null;
  await render(<ForgotPin />);
  expect(screen.getByTestId('forgot-pin-no-account')).toBeTruthy();
  expect(screen.queryByTestId('password')).toBeNull();
});
