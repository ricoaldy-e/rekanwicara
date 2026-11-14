import { render, screen } from '@testing-library/react-native';
import About from '../app/about';

let mockHealth: { engine_version: string; mock_mode: boolean } | null = null;
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({}) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({ health: mockHealth }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.1.0' } } }));

it('shows product limits, privacy and app/server versions without needing a server', async () => {
  await render(<About />);
  expect(screen.getByLabelText('Aplikasi: 0.1.0')).toBeTruthy();
  expect(screen.getByLabelText('Mesin: Belum terhubung ke server')).toBeTruthy();
  expect(screen.getByLabelText(/bukan penilaian klinis/i)).toBeTruthy();
  expect(screen.getByText(/tanpa video atau audio/)).toBeTruthy();
});

it('shows the connected engine and identifies mock results', async () => {
  mockHealth = { engine_version: '0.2.0', mock_mode: true };
  await render(<About />);
  expect(screen.getByLabelText('Mesin: 0.2.0')).toBeTruthy();
  expect(screen.getByLabelText(/Server sedang memakai data contoh/)).toBeTruthy();
});

it('has a section per topic, each a heading (Figma 51:558)', async () => {
  await render(<About />);
  for (const name of ['Tentang Rekan Wicara', 'Batas penggunaan', 'Privasi', 'Versi']) {
    expect(screen.getByRole('header', { name })).toBeTruthy();
  }
});
