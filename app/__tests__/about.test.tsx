import { render, screen } from '@testing-library/react-native';
import About from '../app/about';

let mockHealth: { engine_version: string; mock_mode: boolean } | null = null;
jest.mock('../src/state/content', () => ({ useContent: () => ({ health: mockHealth }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.1.0' } } }));

it('shows product limits, privacy and app/server versions without needing a server', async () => {
  await render(<About />);
  expect(screen.getByText('App: 0.1.0')).toBeTruthy();
  expect(screen.getByText('Mesin: Belum terhubung ke server')).toBeTruthy();
  expect(screen.getByLabelText(/bukan penilaian klinis/i)).toBeTruthy();
  expect(screen.getByText(/tanpa video atau audio/)).toBeTruthy();
});

it('shows the connected engine and identifies mock results', async () => {
  mockHealth = { engine_version: '0.2.0', mock_mode: true };
  await render(<About />);
  expect(screen.getByText('Mesin: 0.2.0')).toBeTruthy();
  expect(screen.getByLabelText(/Server memakai mode contoh/)).toBeTruthy();
});
