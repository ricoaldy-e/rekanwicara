import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import SignIn from '../app/auth/sign-in';
import SignUp from '../app/auth/sign-up';
import Index from '../app/index';
import { AuthFailure, mapAuthError } from '../src/auth/errors';
import { createSupabaseAuth } from '../src/auth/session';
import { ApiError } from '../src/api/apiError';
import { createV2Client } from '../src/api/v2';
import { mockAuth } from '../src/mock/auth';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
let mockAuthState = { ready: true, required: true, session: null as null | { uid: string }, uid: 'local' };
let mockOnboarded = true;
let mockHasPin = true;

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  };
});
jest.mock('../src/auth/session', () => ({
  ...jest.requireActual('../src/auth/session'),
  auth: {
    signIn: (...a: unknown[]) => mockSignIn(...a),
    signUp: (...a: unknown[]) => mockSignUp(...a),
  },
}));
// The opening animation has its own tests (SplashIntro.test); here it hands over as soon as the gate is ready.
jest.mock('../src/components/SplashIntro', () => {
  const { useEffect } = require('react');
  return { SplashIntro: ({ ready, onDone }: { ready: boolean; onDone: () => void }) => { useEffect(() => { if (ready) onDone(); }, [ready, onDone]); return null; } };
});
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => mockAuthState }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ ready: true, profile: { onboarded: mockOnboarded } }) }));
jest.mock('../src/pin/pinStore', () => ({ hasPin: async () => mockHasPin }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState = { ready: true, required: true, session: null, uid: 'local' };
  mockOnboarded = true;
  mockHasPin = true;
});

describe('mapAuthError (supabase-js v2 error codes)', () => {
  it.each([
    [new AuthApiError('x', 400, 'invalid_credentials'), 'INVALID_CREDENTIALS'],
    [new AuthApiError('x', 422, 'email_exists'), 'EMAIL_TAKEN'],
    [new AuthApiError('x', 422, 'user_already_exists'), 'EMAIL_TAKEN'],
    [new AuthApiError('x', 400, 'email_not_confirmed'), 'EMAIL_NOT_CONFIRMED'],
    [new AuthApiError('x', 500, 'unexpected_failure'), 'SERVER'],
    [new AuthApiError('x', 429, 'over_request_rate_limit'), 'SERVER'],
    [new AuthRetryableFetchError('offline', 0), 'NETWORK'],
    [new TypeError('Network request failed'), 'NETWORK'],
    [new Error('anything else'), 'SERVER'],
    [new AuthFailure('EMAIL_TAKEN'), 'EMAIL_TAKEN'],
  ] as const)('%#', (error, code) => expect(mapAuthError(error)).toBe(code));

  it('does not look at message text', () => {
    expect(mapAuthError(new AuthApiError('Invalid login credentials', 400, undefined))).toBe('SERVER');
  });
});

describe('createSupabaseAuth', () => {
  const user = { id: 'u1', email: 'a@b.co', user_metadata: { display_name: 'rico' } };
  const make = (auth: Record<string, unknown>) => createSupabaseAuth(() => ({ auth }) as never);

  it('signs up with the username as display_name and returns a session without tokens', async () => {
    const signUp = jest.fn().mockResolvedValue({ data: { session: { user, access_token: 'secret' } }, error: null });
    const res = await make({ signUp }).signUp({ username: 'rico', email: 'a@b.co', password: 'abcdefg1' });
    expect(signUp).toHaveBeenCalledWith({ email: 'a@b.co', password: 'abcdefg1', options: { data: { display_name: 'rico' } } });
    expect(res).toEqual({ uid: 'u1', email: 'a@b.co', displayName: 'rico' });
    expect(JSON.stringify(res)).not.toMatch(/secret|abcdefg1/);
  });

  it('returns null when the email must be confirmed first', async () => {
    const signUp = jest.fn().mockResolvedValue({ data: { session: null, user }, error: null });
    expect(await make({ signUp }).signUp({ username: 'rico', email: 'a@b.co', password: 'abcdefg1' })).toBeNull();
  });

  it('turns SDK errors into AuthFailure codes, without the SDK message or the password', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: {}, error: new AuthApiError('Invalid login credentials abcdefg1', 400, 'invalid_credentials') });
    const err = await make({ signInWithPassword }).signIn({ email: 'a@b.co', password: 'abcdefg1' }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthFailure);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(String(err.message)).not.toMatch(/abcdefg1/);
  });

  it('maps a thrown network failure to NETWORK', async () => {
    const signInWithPassword = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(make({ signInWithPassword }).signIn({ email: 'a@b.co', password: 'x1y2z3w4' })).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('refreshes the access token, and returns null when it cannot', async () => {
    const refreshSession = jest.fn().mockResolvedValueOnce({ data: { session: { access_token: 'new' } }, error: null }).mockResolvedValueOnce({ data: {}, error: new Error('x') });
    const a = make({ refreshSession });
    expect(await a.refreshAccessToken()).toBe('new');
    expect(await a.refreshAccessToken()).toBeNull();
  });
});

describe('mock accounts', () => {
  it('follow the documented special emails and never keep a password', async () => {
    await expect(mockAuth.signIn({ email: 'salah@contoh.id', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(mockAuth.signUp({ username: 'rico', email: 'dipakai@contoh.id', password: 'abcdefg1' })).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    expect(await mockAuth.signUp({ username: 'rico', email: 'cek@contoh.id', password: 'abcdefg1' })).toBeNull();
    const session = await mockAuth.signUp({ username: 'rico', email: 'a@b.co', password: 'abcdefg1' });
    expect(session).toEqual({ uid: 'mock-user', email: 'a@b.co', displayName: 'rico' });
    expect(await mockAuth.getSession()).toEqual(session);
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(JSON.stringify(await AsyncStorage.getItem('rw.mock.session'))).not.toMatch(/abcdefg1/);
    await mockAuth.signOut();
    expect(await mockAuth.getSession()).toBeNull();
  });
});

describe('SignIn', () => {
  it('checks both fields on submit, goes to the first wrong one, and does not call the server', async () => {
    await render(<SignIn />);
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(screen.getByTestId('email-error')).toHaveAccessibleName('Isi email.');
    expect(screen.getByTestId('password-error')).toHaveAccessibleName('Isi kata sandi.');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed lowercase email and the password as typed, then goes to the gate', async () => {
    mockSignIn.mockResolvedValue({ uid: 'u1' });
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('email'), '  Rico@Email.COM ');
    await fireEvent.changeText(screen.getByTestId('password'), ' Pass 1 ');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'rico@email.com', password: ' Pass 1 ' });
  });

  it('shows one general line for wrong credentials and keeps what was typed', async () => {
    mockSignIn.mockRejectedValue(new AuthFailure('INVALID_CREDENTIALS'));
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('email'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('password'), 'secret123');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(screen.getByTestId('sign-in-failed')).toHaveAccessibleName('Email atau kata sandi salah.'));
    expect(screen.getByTestId('email').props.value).toBe('a@b.co');
    expect(screen.getByTestId('password').props.value).toBe('secret123');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/"children":\["secret123"\]/);
  });

  it('shows a banner with "Coba lagi" for no connection and tries again', async () => {
    mockSignIn.mockRejectedValueOnce(new AuthFailure('NETWORK')).mockResolvedValueOnce({ uid: 'u1' });
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('email'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('password'), 'secret123');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(screen.getByTestId('sign-in-banner')).toBeTruthy());
    expect(screen.getByTestId('email').props.value).toBe('a@b.co');
    await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('does not send twice while waiting', async () => {
    let finish!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('email'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('password'), 'secret123');
    void fireEvent.press(screen.getByTestId('sign-in-submit')); // the promise stays open, so do not wait for it
    await waitFor(() => expect(screen.getByRole('button', { name: 'Memeriksa…' })).toBeDisabled());
    void fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    finish({ uid: 'u1' });
  });
});

describe('SignUp', () => {
  const fill = async (over: Partial<Record<'username' | 'email' | 'password' | 'repeat', string>> = {}) => {
    const v = { username: 'rico', email: 'a@b.co', password: 'abcdefg1', repeat: 'abcdefg1', ...over };
    for (const [k, t] of Object.entries(v)) await fireEvent.changeText(screen.getByTestId(k), t);
  };

  it('updates the password checklist while typing (icon + text)', async () => {
    await render(<SignUp />);
    const rule = (name: string) => screen.getByLabelText(new RegExp(`^${name}, `));
    expect(rule('8 karakter atau lebih').props.accessibilityLabel).toBe('8 karakter atau lebih, belum');
    await fireEvent.changeText(screen.getByTestId('password'), 'abc');
    expect(rule('Ada huruf').props.accessibilityLabel).toBe('Ada huruf, terpenuhi');
    expect(rule('Ada angka').props.accessibilityLabel).toBe('Ada angka, belum');
    await fireEvent.changeText(screen.getByTestId('password'), 'abcdefg1');
    expect(rule('8 karakter atau lebih').props.accessibilityLabel).toBe('8 karakter atau lebih, terpenuhi');
    expect(rule('Ada angka').props.accessibilityLabel).toBe('Ada angka, terpenuhi');
  });

  it('needs the repeat to match and the privacy consent', async () => {
    await render(<SignUp />);
    await fill({ repeat: 'abcdefg2' });
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    expect(screen.getByTestId('repeat-error')).toHaveAccessibleName('Kata sandi tidak sama.');
    expect(screen.getByTestId('consent-error')).toHaveAccessibleName('Centang persetujuan untuk melanjutkan.');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows EMAIL_TAKEN on the email field and keeps the other values', async () => {
    mockSignUp.mockRejectedValue(new AuthFailure('EMAIL_TAKEN'));
    await render(<SignUp />);
    await fill();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    await waitFor(() => expect(screen.getByTestId('email-error')).toHaveAccessibleName('Email ini sudah terdaftar. Coba masuk.'));
    expect(screen.getByTestId('username').props.value).toBe('rico');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes to the gate with a session, and to "Cek email" without one', async () => {
    mockSignUp.mockResolvedValueOnce({ uid: 'u1' }).mockResolvedValueOnce(null);
    await render(<SignUp />);
    await fill();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/'));
    expect(mockSignUp).toHaveBeenCalledWith({ username: 'rico', email: 'a@b.co', password: 'abcdefg1' });
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/auth/check-email'));
  });
});

describe('start gate', () => {
  const target = async () => {
    await render(<Index />);
    return waitFor(() => screen.getByTestId('redirect')).then((el) => el.props.children);
  };

  it('signed out → Selamat datang', async () => expect(await target()).toBe('/welcome'));

  it('signed in without a PIN → Buat PIN', async () => {
    mockAuthState = { ...mockAuthState, session: { uid: 'u1' }, uid: 'u1' };
    mockHasPin = false;
    expect(await target()).toBe('/auth/create-pin');
  });

  it('PIN but no onboarding → onboarding', async () => {
    mockAuthState = { ...mockAuthState, session: { uid: 'u1' }, uid: 'u1' };
    mockOnboarded = false;
    expect(await target()).toBe('/onboarding');
  });

  it('everything done → Beranda', async () => {
    mockAuthState = { ...mockAuthState, session: { uid: 'u1' }, uid: 'u1' };
    expect(await target()).toBe('/home');
  });

  it('without accounts (no Supabase, no mock) skips sign-in', async () => {
    mockAuthState = { ready: true, required: false, session: null, uid: 'local' };
    expect(await target()).toBe('/home');
  });

  it('waits while the saved session is being read', async () => {
    mockAuthState = { ...mockAuthState, ready: false };
    await render(<Index />);
    expect(screen.queryByTestId('redirect')).toBeNull();
  });
});

describe('v2 client: 401', () => {
  const unauthorized = () => new Response(JSON.stringify({ detail: { code: 'UNAUTHENTICATED', message: 'x' } }), { status: 401 });
  const okCatalog = () => new Response(JSON.stringify({ level_1: [], words: [] }), { status: 200 });

  it('refreshes the session once and retries', async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(okCatalog());
    const refreshSession = jest.fn().mockResolvedValue(true);
    const onSessionLost = jest.fn();
    const v2 = createV2Client({ baseUrl: 'http://x', fetchFn: fetchFn as never, refreshSession, onSessionLost });
    await expect(v2.getCatalog()).resolves.toEqual({ level_1: [], words: [] });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it('signs out when the refresh fails or the retry is refused again, and only retries once', async () => {
    const fetchFn = jest.fn().mockImplementation(async () => unauthorized());
    const onSessionLost = jest.fn();
    const failed = createV2Client({ baseUrl: 'http://x', fetchFn: fetchFn as never, refreshSession: async () => false, onSessionLost });
    await expect(failed.getCatalog()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionLost).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    fetchFn.mockClear();
    const again = createV2Client({ baseUrl: 'http://x', fetchFn: fetchFn as never, refreshSession: async () => true, onSessionLost });
    await expect(again.getCatalog()).rejects.toBeInstanceOf(ApiError);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(onSessionLost).toHaveBeenCalledTimes(2);
  });

  it('does not refresh for other errors', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { code: 'ITEM_NOT_FOUND', message: 'x' } }), { status: 404 }));
    const refreshSession = jest.fn();
    const v2 = createV2Client({ baseUrl: 'http://x', fetchFn: fetchFn as never, refreshSession });
    await expect(v2.getWord('x')).rejects.toMatchObject({ code: 'ITEM_NOT_FOUND' });
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

describe('Masuk and Daftar layout (Figma 27:38, 27:146)', () => {
  it('Masuk shows the brand, its intro, the product boundary and a link to Daftar', async () => {
    await render(<SignIn />);
    expect(screen.getByLabelText('Rekan Wicara')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Masuk' })).toBeTruthy();
    expect(screen.getByText(/Pendamping hanya perlu masuk sekali di HP ini/)).toBeTruthy();
    expect(screen.getByText('Rekan Wicara adalah alat bantu latihan, bukan pengganti terapis wicara.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Belum punya akun? Daftar' })).toBeTruthy();
  });

  it('Daftar has its own "Kembali" capsule and a link back to Masuk', async () => {
    await render(<SignUp />);
    expect(screen.getByRole('header', { name: 'Buat akun Pendamping' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sudah punya akun? Masuk' })).toBeTruthy();
  });
});
