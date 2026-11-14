import { fireEvent, render, screen } from '@testing-library/react-native';

import About from '../app/about';
import Privacy from '../app/privacy';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../src/content/privacy';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({}), useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/state/content', () => ({ useContent: () => ({ health: null }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.1.0' } } }));

describe('Kebijakan privasi', () => {
  it('shows the title, the date, the intro and one heading per section', async () => {
    await render(<Privacy />);
    expect(screen.getByRole('header', { name: 'Kebijakan Privasi' })).toBeTruthy();
    expect(screen.getByText(`Diperbarui ${PRIVACY_UPDATED}`)).toBeTruthy();
    expect(screen.getByText(PRIVACY_INTRO)).toBeTruthy();
    for (const s of PRIVACY_SECTIONS) expect(screen.getByRole('header', { name: s.title })).toBeTruthy();
  });

  it('states the promises the app keeps: recordings deleted, no face recognition, no video or audio online', () => {
    const all = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(all).toMatch(/dihapus segera setelah dinilai/);
    expect(all).toMatch(/Tidak ada pengenalan identitas wajah/);
    expect(all).toMatch(/tanpa video atau audio/);
    expect(all).toMatch(/Wav2Vec2/);
    expect(all).toMatch(/rekanwicara@gmail\.com/);
  });

  it('uses no word the product forbids (CLAUDE.md)', () => {
    const all = [PRIVACY_INTRO, ...PRIVACY_SECTIONS.flatMap((s) => [s.title, ...s.paragraphs])].join(' ');
    expect(all).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis|tunarungu|penderita)\b/i);
    expect(all).not.toMatch(/\bterapi\b/i); // "terapis wicara" is allowed
  });
});

it('Tentang links to the privacy policy', async () => {
  await render(<About />);
  await fireEvent.press(screen.getByTestId('privacy-link'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/privacy', params: { from: 'Tentang' } });
});
