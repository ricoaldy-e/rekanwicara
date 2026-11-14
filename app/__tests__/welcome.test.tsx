import { fireEvent, render, screen } from '@testing-library/react-native';

import Welcome from '../app/welcome';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => mockPush.mockClear());

describe('Selamat datang', () => {
  it('shows the mark, the promise and the product boundary', async () => {
    await render(<Welcome />);
    expect(screen.getByTestId('welcome-logo')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Berlatih bicara dengan melihat.' })).toBeTruthy();
    expect(screen.getByText('Lihat bentuk bibirmu, rasakan getarnya, lalu ulangi sampai terasa pas.')).toBeTruthy();
    expect(screen.getByText('Alat bantu latihan, bukan pengganti terapis wicara.')).toBeTruthy();
  });

  it('leads to Masuk and to Buat akun', async () => {
    await render(<Welcome />);
    await fireEvent.press(screen.getByRole('button', { name: 'Masuk' }));
    expect(mockPush).toHaveBeenLastCalledWith('/auth/sign-in');
    await fireEvent.press(screen.getByRole('button', { name: 'Buat akun' }));
    expect(mockPush).toHaveBeenLastCalledWith('/auth/sign-up');
  });

  it('uses no clinical wording', async () => {
    await render(<Welcome />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis)\b/i);
  });
});
