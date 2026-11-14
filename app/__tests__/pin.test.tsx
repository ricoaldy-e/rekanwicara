import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

import CreatePin from '../app/auth/create-pin';
import TabsLayout from '../app/(tabs)/_layout';
import { PIN_LIMITS } from '../src/forms/limits';
import { afterFailure, lockState, NO_FAILURES, parseLock } from '../src/pin/lock';
import { attemptPin, getLock, hasPin, LOCAL_UID, recordFailure, savePin, verifyPin } from '../src/pin/pinStore';
import { PinGate } from '../src/pin/PinGate';
import { PinSessionProvider, usePinSession } from '../src/pin/PinSession';

const mockStore = new Map<string, string>();
const mockReplace = jest.fn();
const mockBuzz = jest.fn();
let mockProfile = { onboarded: false };
let mockSegments: string[] = ['(tabs)', 'companion'];

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    if (!/^[\w.-]+$/.test(k)) throw new Error('Invalid key');
    mockStore.set(k, v);
  },
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));
jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Tabs = Object.assign(({ children }: { children: React.ReactNode }) => <View>{children}</View>, { Screen: () => null });
  return {
    Tabs,
    Redirect: ({ href }: { href: string }) => {
      const { Text: T } = require('react-native');
      return <T testID="redirect">{href}</T>;
    },
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useSegments: () => mockSegments,
  };
});
let mockSession: { email: string } | null = null;
const mockPush = jest.fn();
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ uid: 'local', session: mockSession }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ profile: mockProfile }) }));
jest.mock('../src/a11y/haptics', () => ({ buzzLight: () => mockBuzz() }));

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  mockProfile = { onboarded: false };
  mockSegments = ['(tabs)', 'companion'];
  mockSession = null;
});

describe('lockState (pure)', () => {
  it('is locked until the time passes, and reading again changes nothing', () => {
    const until = 1_000_000 + PIN_LIMITS.lockMs;
    expect(lockState(0, until, 1_000_000)).toEqual({ locked: true, secondsLeft: 30, triesLeft: 5 });
    expect(lockState(0, until, 1_000_000)).toEqual(lockState(0, until, 1_000_000));
    expect(lockState(0, until, until - 1).secondsLeft).toBe(1);
    expect(lockState(0, until, until).locked).toBe(false);
  });

  it('locks on the 5th wrong PIN for 30 seconds, then gives fresh tries', () => {
    let data = NO_FAILURES;
    for (let i = 1; i < PIN_LIMITS.maxFailures; i++) {
      data = afterFailure(data, 1000);
      expect(lockState(data.failures, data.lockedUntil, 1000)).toMatchObject({ locked: false, triesLeft: PIN_LIMITS.maxFailures - i });
    }
    data = afterFailure(data, 1000);
    expect(data).toEqual({ failures: 0, lockedUntil: 1000 + 30_000 });
    expect(lockState(data.failures, data.lockedUntil, 1000).locked).toBe(true);
    expect(lockState(data.failures, data.lockedUntil, 31_001)).toEqual({ locked: false, secondsLeft: 0, triesLeft: 5 });
  });

  it('treats damaged saved data as no failures', () => {
    expect(parseLock('nope')).toEqual(NO_FAILURES);
    expect(parseLock(null)).toEqual(NO_FAILURES);
    expect(parseLock('{"failures":-1,"lockedUntil":0}')).toEqual(NO_FAILURES);
    expect(parseLock('{"failures":2,"lockedUntil":9}')).toEqual({ failures: 2, lockedUntil: 9 });
  });
});

describe('pinStore', () => {
  it('keeps one PIN per account', async () => {
    await savePin('a', '2580');
    await savePin('b', '1357');
    expect(await verifyPin('a', '2580')).toBe(true);
    expect(await verifyPin('a', '1357')).toBe(false);
    expect(await verifyPin('b', '1357')).toBe(true);
    expect(await hasPin('c')).toBe(false);
  });

  it('moves the old single PIN to the account once', async () => {
    mockStore.set('cw.companionPin', '4821');
    expect(await hasPin(LOCAL_UID)).toBe(true);
    expect(mockStore.has('cw.companionPin')).toBe(false);
    expect(await verifyPin(LOCAL_UID, '4821')).toBe(true);
    await savePin(LOCAL_UID, '2580');
    mockStore.set('cw.companionPin', '9999'); // an old key must not overwrite a newer PIN
    expect(await verifyPin(LOCAL_UID, '2580')).toBe(true);
  });

  it('counts wrong PINs, locks at the 5th, and remembers it (no reset when read again)', async () => {
    await savePin(LOCAL_UID, '2580');
    const now = 5_000_000;
    for (let i = 0; i < 4; i++) expect(await attemptPin(LOCAL_UID, '0000', now)).toMatchObject({ ok: false, locked: false, triesLeft: 4 - i });
    expect(await attemptPin(LOCAL_UID, '0000', now)).toMatchObject({ ok: false, locked: true, secondsLeft: 30 });
    // Even the right PIN is refused while locked, and a re-read after "closing the app" still says locked.
    expect(await attemptPin(LOCAL_UID, '2580', now + 1000)).toMatchObject({ ok: false, locked: true, secondsLeft: 29 });
    expect((await getLock(LOCAL_UID, now + 10_000)).locked).toBe(true);
    expect((await getLock(LOCAL_UID, now + 31_000)).locked).toBe(false);
    expect(await attemptPin(LOCAL_UID, '2580', now + 31_000)).toEqual({ ok: true });
  });

  it('a right PIN clears earlier wrong tries', async () => {
    await savePin(LOCAL_UID, '2580');
    await recordFailure(LOCAL_UID, 1);
    await attemptPin(LOCAL_UID, '2580', 2);
    expect((await getLock(LOCAL_UID, 3)).triesLeft).toBe(PIN_LIMITS.maxFailures);
  });
});

async function typePin(pin: string) {
  for (const d of pin) await fireEvent.press(screen.getByRole('button', { name: `Angka ${d}` }));
}

describe('CreatePin', () => {
  it('refuses a weak PIN, then goes back to step 1 when the repeat differs', async () => {
    await render(<CreatePin />);
    expect(screen.getByText('Buat PIN 4 angka')).toBeTruthy();
    await typePin('1234');
    expect(screen.getByLabelText('PIN terlalu mudah ditebak. Pilih angka lain.')).toBeTruthy();
    expect(screen.getByText('Buat PIN 4 angka')).toBeTruthy();
    await typePin('2580');
    expect(screen.getByText('Ulangi PIN')).toBeTruthy();
    await typePin('2581');
    expect(screen.getByLabelText('PIN tidak sama. Ulangi dari awal.')).toBeTruthy();
    expect(screen.getByText('Buat PIN 4 angka')).toBeTruthy();
    expect(mockStore.size).toBe(0);
  });

  it('saves the PIN and continues to onboarding, or home when onboarding is done', async () => {
    await render(<CreatePin />);
    await typePin('2580');
    await typePin('2580');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
    expect(await verifyPin(LOCAL_UID, '2580')).toBe(true);

    mockProfile = { onboarded: true };
    mockReplace.mockClear();
    await render(<CreatePin />);
    await typePin('2580');
    await typePin('2580');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('shows the step, and "Kembali" on step 2 returns to step 1 without saving', async () => {
    await render(<CreatePin />);
    expect(screen.getByText('Langkah 1 dari 2')).toBeTruthy();
    expect(screen.queryByTestId('create-pin-back')).toBeNull(); // nowhere to go back to from step 1
    await typePin('2580');
    expect(screen.getByText('Langkah 2 dari 2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('create-pin-back'));
    expect(screen.getByText('Buat PIN 4 angka')).toBeTruthy();
    expect(mockStore.size).toBe(0);
  });

  it('does not claim to be security', async () => {
    await render(<CreatePin />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(aman|keamanan)\b/i);
  });
});

describe('PinGate', () => {
  const open = async () => {
    await render(
      <PinSessionProvider>
        <PinGate>
          <Text testID="inside">isi</Text>
        </PinGate>
      </PinSessionProvider>,
    );
    await waitFor(() => expect(screen.getByText('Masukkan PIN Pendamping')).toBeTruthy());
  };

  it('opens by itself at the 4th digit when the PIN is right', async () => {
    await savePin(LOCAL_UID, '2580');
    await open();
    expect(screen.queryByTestId('inside')).toBeNull();
    await typePin('2580');
    await waitFor(() => expect(screen.getByTestId('inside')).toBeTruthy());
  });

  it('says how many tries are left, empties the dots, and taps lightly', async () => {
    await savePin(LOCAL_UID, '2580');
    await open();
    await typePin('1111');
    await waitFor(() => expect(screen.getByLabelText('PIN salah. Sisa 4 percobaan.')).toBeTruthy());
    expect(screen.getByTestId('pin-dots')).toHaveAccessibleName('0 dari 4 angka terisi');
    expect(mockBuzz).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('inside')).toBeNull();
  });

  it('disables the pad and shows the countdown when locked, also after a restart', async () => {
    await savePin(LOCAL_UID, '2580');
    await open();
    for (let i = 0; i < PIN_LIMITS.maxFailures; i++) {
      await typePin('1111');
      await waitFor(() => expect(screen.getByTestId('pin-dots')).toHaveAccessibleName('0 dari 4 angka terisi'));
    }
    await waitFor(() => expect(screen.getByLabelText(/^Terlalu banyak percobaan\. Coba lagi dalam \d+ detik\.$/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Angka 5' }).props.accessibilityState).toMatchObject({ disabled: true });

    // "Close the app": a new gate reads the saved lock.
    await screen.unmount();
    await open();
    await waitFor(() => expect(screen.getByLabelText(/^Terlalu banyak percobaan/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Angka 5' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('offers "Lupa PIN?" only with an account, and opens the reset screen', async () => {
    await savePin(LOCAL_UID, '2580');
    await open();
    expect(screen.queryByTestId('forgot-pin')).toBeNull(); // no account: nothing to prove
    await screen.unmount();
    mockSession = { email: 'a@b.co' };
    await open();
    await fireEvent.press(screen.getByRole('link', { name: 'Lupa PIN?' }));
    expect(mockPush).toHaveBeenCalledWith('/auth/forgot-pin');
  });

  it('sends the user to make a PIN when none exists', async () => {
    await render(
      <PinSessionProvider>
        <PinGate>
          <Text>isi</Text>
        </PinGate>
      </PinSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('redirect')).toHaveTextContent('/auth/create-pin'));
  });
});

describe('PinSession', () => {
  function Probe() {
    const { unlocked, unlock } = usePinSession();
    return <Text testID="state" onPress={unlock}>{unlocked ? 'open' : 'closed'}</Text>;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('closes after 5 minutes without a touch, and a touch restarts the wait', async () => {
    function Touch() {
      const { touch } = usePinSession();
      return <Text testID="touch" onPress={touch}>t</Text>;
    }
    await render(<PinSessionProvider><Probe /><Touch /></PinSessionProvider>);
    await fireEvent.press(screen.getByTestId('state'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    await act(async () => jest.advanceTimersByTime(PIN_LIMITS.idleMs - 1000));
    await fireEvent.press(screen.getByTestId('touch'));
    await act(async () => jest.advanceTimersByTime(PIN_LIMITS.idleMs - 1000));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('closes when the app leaves the foreground', async () => {
    let listener: (s: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: (s: string) => void) => {
      listener = l;
      return { remove: jest.fn() };
    }) as never);
    await render(<PinSessionProvider><Probe /></PinSessionProvider>);
    await fireEvent.press(screen.getByTestId('state'));
    await act(async () => listener('active'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    await act(async () => listener('background'));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('closes when the Latihan tab is shown, but not on the companion tabs', async () => {
    function Open() {
      const { unlocked, unlock } = usePinSession();
      return <Text testID="state" onPress={unlock}>{unlocked ? 'open' : 'closed'}</Text>;
    }
    const tree = () => (
      <PinSessionProvider>
        <Open />
        <TabsLayout />
      </PinSessionProvider>
    );
    const view = await render(tree());
    await fireEvent.press(screen.getByTestId('state'));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    mockSegments = ['(tabs)', 'settings'];
    await view.rerender(tree());
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    mockSegments = ['(tabs)', 'home'];
    await view.rerender(tree());
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
