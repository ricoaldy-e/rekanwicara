import type { V2Options } from '../api/v2';
import { auth } from './session';

/**
 * What the v2 API client needs from the account (kontrak §3, §9): the Bearer token, one session refresh after a
 * 401, and what to do when the session cannot be saved. Signing out empties the session, and the signed-out
 * redirect in the root layout then takes the user to Masuk.
 */
export const v2Auth: Pick<V2Options, 'getToken' | 'refreshSession' | 'onSessionLost'> = {
  getToken: () => auth.getAccessToken(),
  refreshSession: async () => (await auth.refreshAccessToken()) !== null,
  onSessionLost: () => void auth.signOut().catch(() => undefined),
};

type AccountHooks = typeof v2Auth;

/** `opts` with the account defaults filled in; an option that is missing or undefined keeps the default. */
export function withAccount<T extends Partial<AccountHooks>>(opts: T): T & AccountHooks {
  const given = Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined));
  return { ...v2Auth, ...given } as T & AccountHooks;
}
