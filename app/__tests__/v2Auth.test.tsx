import { render } from '@testing-library/react-native';

import { SignedOutRedirect } from '../src/auth/SignedOutRedirect';
import { v2Auth, withAccount } from '../src/auth/v2Auth';
import { analyze } from '../src/data/analyze';

const mockReplace = jest.fn();
const mockV2Analyze = jest.fn();
const mockCreateV2 = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn();
let mockAuthState: { ready: boolean; required: boolean; session: null | { uid: string } } = { ready: true, required: true, session: null };
let mockSegments: string[] = ['(tabs)', 'home'];

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }), useSegments: () => mockSegments }));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => mockAuthState }));
jest.mock('../src/auth/session', () => ({
  auth: {
    getAccessToken: async () => 'tok',
    refreshAccessToken: (...a: unknown[]) => mockRefresh(...a),
    signOut: (...a: unknown[]) => mockSignOut(...a),
  },
}));
jest.mock('../src/api/v2', () => ({
  createV2Client: (o: unknown) => {
    mockCreateV2(o);
    return { analyze: (...a: unknown[]) => mockV2Analyze(...a) };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState = { ready: true, required: true, session: null };
  mockSegments = ['(tabs)', 'home'];
});

describe('account defaults for the v2 client', () => {
  it('give the Bearer token, refresh once, and sign out when the session is lost', async () => {
    expect(await v2Auth.getToken!()).toBe('tok');
    mockRefresh.mockResolvedValueOnce('new').mockResolvedValueOnce(null);
    expect(await v2Auth.refreshSession!()).toBe(true);
    expect(await v2Auth.refreshSession!()).toBe(false);
    v2Auth.onSessionLost!();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('keep the default when an option is missing or undefined, and let a caller override it', () => {
    const own = async () => 'mine';
    expect(withAccount({ getToken: undefined }).getToken).toBe(v2Auth.getToken);
    expect(withAccount({ getToken: own }).getToken).toBe(own);
    expect(withAccount({}).onSessionLost).toBe(v2Auth.onSessionLost);
  });

  it('analyze on v2 hands the account token handling to the client', async () => {
    mockV2Analyze.mockResolvedValue({
      status: 'retry', item_id: 'l1_a', level: 1, result: null, lip_result: null, voice_result: null, lip_feedback: null,
      voice_feedback: null, feedback: { code: 'x', message: '' }, quality_flags: [], visuals: null, engine: 'e', processing_ms: 1,
    });
    const item = { key: 'l1_a', itemId: 'l1_a', level: 1, text: 'A', instruction: '', source: 'default' } as const;
    await analyze(
      { file: { uri: 'file:///a.mp4', name: 'a.mp4', type: 'video/mp4' }, item: { ...item }, sessionId: 's', userId: 'u' },
      { api: { baseUrl: 'http://x' } as never, source: 'v2' },
    );
    expect(mockCreateV2.mock.calls[0][0]).toMatchObject({
      baseUrl: 'http://x',
      getToken: v2Auth.getToken,
      refreshSession: v2Auth.refreshSession,
      onSessionLost: v2Auth.onSessionLost,
    });
  });
});

describe('SignedOutRedirect', () => {
  it('goes to Selamat datang when the session disappears inside the app', async () => {
    await render(<SignedOutRedirect />);
    expect(mockReplace).toHaveBeenCalledWith('/welcome');
  });

  it.each([
    ['signed in', { ready: true, required: true, session: { uid: 'u' } }, ['(tabs)', 'home']],
    ['no accounts in this build', { ready: true, required: false, session: null }, ['(tabs)', 'home']],
    ['the session is still loading', { ready: false, required: true, session: null }, ['(tabs)', 'home']],
    ['already on an auth screen', { ready: true, required: true, session: null }, ['auth', 'sign-in']],
    ['already on Selamat datang', { ready: true, required: true, session: null }, ['welcome']],
    ['on the start gate', { ready: true, required: true, session: null }, []],
  ])('does nothing when %s', async (_name, state, segments) => {
    mockAuthState = state;
    mockSegments = segments;
    await render(<SignedOutRedirect />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
