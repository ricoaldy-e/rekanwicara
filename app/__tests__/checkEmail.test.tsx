import { fireEvent, render, screen } from '@testing-library/react-native';

import CheckEmail from '../app/auth/check-email';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

beforeEach(() => mockReplace.mockClear());

it('tells the user to confirm the email and offers both ways on', async () => {
  await render(<CheckEmail />);
  expect(screen.getByTestId('check-email-note')).toHaveAccessibleName('Buka email untuk konfirmasi, lalu masuk.');
  await fireEvent.press(screen.getByText('Ke halaman Masuk'));
  expect(mockReplace).toHaveBeenLastCalledWith('/auth/sign-in');
  await fireEvent.press(screen.getByTestId('check-email-back'));
  expect(mockReplace).toHaveBeenLastCalledWith('/auth/sign-in');
  await fireEvent.press(screen.getByTestId('check-email-resend'));
  expect(mockReplace).toHaveBeenLastCalledWith('/auth/sign-up');
});
