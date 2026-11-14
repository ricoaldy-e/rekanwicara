import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppHeader, backLabel } from '../src/navigation/AppHeader';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 40, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  mockBack.mockClear();
});

it('shows only the back capsule named after the previous screen, and goes back', async () => {
  await render(<AppHeader back={{ title: 'Latihan' }} options={{}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Latihan' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('has no back capsule on a first screen or when the screen turns it off', async () => {
  await render(<AppHeader options={{}} />);
  expect(screen.queryByRole('button')).toBeNull();
  await render(<AppHeader back={{ title: 'x' }} options={{ headerBackVisible: false }} />);
  expect(screen.queryByRole('button')).toBeNull();
});

it('never shows a route name such as "(tabs)" on the back capsule', () => {
  expect(backLabel(undefined, '(tabs)')).toBe('Kembali');
  expect(backLabel('Pengaturan', '(tabs)')).toBe('Pengaturan');
  expect(backLabel(undefined, 'Latihan')).toBe('Latihan');
  expect(backLabel()).toBe('Kembali');
});
