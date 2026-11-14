import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Onboarding from '../app/onboarding';

const mockReplace = jest.fn();
const mockComplete = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ completeOnboarding: mockComplete }) }));

beforeEach(() => {
  mockReplace.mockClear();
  mockComplete.mockReset();
});

async function toConsent() {
  await render(<Onboarding />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));
}

describe('Onboarding', () => {
  it('explains that it is a practice aid, not a replacement for a teacher or therapist', async () => {
    await render(<Onboarding />);
    expect(screen.getByLabelText(/Bukan pengganti guru atau terapis, dan bukan penilaian klinis/)).toBeTruthy();
  });

  it('needs both consents before continuing', async () => {
    await toConsent();
    const next = () => screen.getByRole('button', { name: 'Lanjut ke kalibrasi' });
    expect(next()).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Saya mengerti/ }));
    expect(next()).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Pendamping/ }));
    expect(next()).toBeEnabled();
  });

  it('has two steps and finishes at the consent: no PIN here any more', async () => {
    await toConsent();
    expect(screen.getByLabelText(/^Langkah 2 dari 2/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Saya mengerti/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Pendamping/ }));
    expect(screen.queryByTestId('pin-input')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke kalibrasi' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calibration'));
    expect(mockComplete).toHaveBeenCalledWith();
  });
});

describe('Onboarding layout (Figma 29:182, 29:235)', () => {
  it('step 1 shows the cycle and the sticky "Lanjut" button', async () => {
    await render(<Onboarding />);
    expect(screen.getByLabelText(/^Langkah 1 dari 2/)).toBeTruthy();
    for (const t of ['Lihat contoh bentuk bibir.', 'Tiru dan rekam wajah dan suaramu.', 'Bandingkan hasilnya.', 'Ulangi sampai terasa pas.']) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeTruthy();
  });

  it('step 2 says why "Lanjut ke kalibrasi" is off, until both consents are ticked', async () => {
    await toConsent();
    expect(screen.getByText('Centang kedua persetujuan untuk lanjut.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Saya mengerti/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Pendamping/ }));
    expect(screen.queryByText('Centang kedua persetujuan untuk lanjut.')).toBeNull();
    expect(screen.getByRole('checkbox', { name: /Saya mengerti/ })).toBeChecked();
  });

  it('"Kembali" returns to step 1', async () => {
    await toConsent();
    await fireEvent.press(screen.getByRole('button', { name: 'Kembali' }));
    expect(screen.getByLabelText(/^Langkah 1 dari 2/)).toBeTruthy();
  });
});
