import { fireEvent, render, screen } from '@testing-library/react-native';

import Home from '../app/home';
import { newProfile } from '../src/user/pure';

const mockReload = jest.fn();
const mockPush = jest.fn();
const mockProfile = { ...newProfile(), calibrated: true };
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({
  health: null, items: [], loading: false, error: null, healthError: null, reload: mockReload,
}) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile, progress: new Map(), demo: true }) }));

it('offers recovery for an empty list, labels demo data and links to About', async () => {
  await render(<Home />);
  expect(screen.getByLabelText(/Mode demo: progres contoh/)).toBeTruthy();
  expect(screen.getByLabelText(/Materi belum tersedia/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Muat ulang materi' }));
  expect(mockReload).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Tentang aplikasi' }));
  expect(mockPush).toHaveBeenCalledWith('/about');
});
