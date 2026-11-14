import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Onboarding from '../app/onboarding';

const mockReplace = jest.fn();
const mockComplete = jest.fn();
let mockSession: object | null = { user: { id: 'fixture-account' } };

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ session: mockSession, completeOnboarding: mockComplete }) }));

beforeEach(() => {
  mockSession = { user: { id: 'fixture-account' } };
  mockReplace.mockClear();
  mockComplete.mockReset().mockResolvedValue(undefined);
});

async function toConsent() {
  await render(<Onboarding />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));
}

describe('Onboarding', () => {
  it('requires account login before offering PIN onboarding', async () => {
    mockSession = null;
    await render(<Onboarding />);
    expect(screen.getByText('Login pendamping')).toBeTruthy();
    expect(screen.queryByTestId('pin-input')).toBeNull();
    expect(mockComplete).not.toHaveBeenCalled();
  });
  it('explains that it is a practice aid, not a replacement for a teacher or therapist', async () => {
    await render(<Onboarding />);
    expect(screen.getByLabelText(/Bukan pengganti guru atau terapis, dan bukan penilaian klinis/)).toBeTruthy();
  });

  it('needs both consents before continuing', async () => {
    await toConsent();
    const next = () => screen.getByRole('button', { name: 'Lanjut' });
    expect(next()).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Saya mengerti/ }));
    expect(next()).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Pendamping/ }));
    expect(next()).toBeEnabled();
  });

  async function toPin() {
    await toConsent();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Saya mengerti/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Pendamping/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));
  }

  it('rejects a PIN that is too short or does not match, and keeps digits only', async () => {
    await toPin();
    const save = () => screen.getByRole('button', { name: /Simpan/ });
    await fireEvent.changeText(screen.getByTestId('pin-input'), '12a4');
    expect(screen.getByTestId('pin-input').props.value).toBe('124');
    expect(save()).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('pin-input'), '1234');
    await fireEvent.changeText(screen.getByTestId('pin-again-input'), '1235');
    expect(save()).toBeDisabled();
    expect(screen.getByLabelText('Kedua PIN belum sama.')).toBeTruthy();
  });

  it('stores the PIN and goes to calibration', async () => {
    await toPin();
    await fireEvent.changeText(screen.getByTestId('pin-input'), '4821');
    await fireEvent.changeText(screen.getByTestId('pin-again-input'), '4821');
    await fireEvent.press(screen.getByRole('button', { name: /Simpan/ }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/calibration'));
    expect(mockComplete).toHaveBeenCalledWith('4821');
  });

  it('stays on the PIN step when the keystore refuses the PIN', async () => {
    mockComplete.mockRejectedValue(new Error('keystore'));
    await toPin();
    await fireEvent.changeText(screen.getByTestId('pin-input'), '4821');
    await fireEvent.changeText(screen.getByTestId('pin-again-input'), '4821');
    await fireEvent.press(screen.getByRole('button', { name: /Simpan/ }));
    await waitFor(() => expect(screen.getByLabelText('PIN belum bisa disimpan. Coba lagi.')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
