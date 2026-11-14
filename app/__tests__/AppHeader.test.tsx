import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppHeader } from '../src/navigation/AppHeader';

const mockBack = jest.fn();
let mockDemo = false;
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 40, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ demo: mockDemo }) }));

beforeEach(() => {
  mockBack.mockClear();
  mockDemo = false;
});

it('shows only the back capsule named after the previous screen, and goes back', async () => {
  await render(<AppHeader back={{ title: 'Latihan' }} options={{}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Latihan' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Mode demo')).toBeNull();
});

it('has no back capsule on a first screen or when the screen turns it off', async () => {
  await render(<AppHeader options={{}} />);
  expect(screen.queryByRole('button')).toBeNull();
  await render(<AppHeader back={{ title: 'x' }} options={{ headerBackVisible: false }} />);
  expect(screen.queryByRole('button')).toBeNull();
});

it('says "Mode demo" at the right only in demo mode', async () => {
  mockDemo = true;
  await render(<AppHeader options={{}} />);
  expect(screen.getByLabelText('Mode demo aktif')).toBeTruthy();
});
