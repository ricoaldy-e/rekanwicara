import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/** What the sign-in/sign-up screens react to (kontrak §9). */
export type AuthCode = 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'EMAIL_NOT_CONFIRMED' | 'NETWORK' | 'SERVER';

export class AuthFailure extends Error {
  readonly code: AuthCode;
  constructor(code: AuthCode) {
    super(code); // never the SDK's message, never anything the user typed
    this.name = 'AuthFailure';
    this.code = code;
  }
}

/**
 * The one place that turns a supabase-js error into a UI code. It looks at the machine-readable `code`
 * of the error (supabase-js v2 ErrorCode), never at its message text.
 */
export function mapAuthError(error: unknown): AuthCode {
  if (error instanceof AuthFailure) return error.code;
  if (isAuthRetryableFetchError(error)) return 'NETWORK';
  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'INVALID_CREDENTIALS';
      case 'email_exists':
      case 'user_already_exists':
        return 'EMAIL_TAKEN';
      case 'email_not_confirmed':
        return 'EMAIL_NOT_CONFIRMED';
      default:
        return 'SERVER';
    }
  }
  // fetch itself failed before supabase-js could wrap it
  if (error instanceof TypeError) return 'NETWORK';
  return 'SERVER';
}
