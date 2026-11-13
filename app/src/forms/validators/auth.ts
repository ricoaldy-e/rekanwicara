/** Pure auth rules (flow §7.1.1; sign-in uses the email only, kontrak FE §1 #4). A validator returns a message key or null. */
import { LIMITS } from '../limits';
import type { MessageKey } from '../messages';

const USERNAME_START = /^[A-Za-z]/;
const USERNAME_CHARS = /^[A-Za-z0-9._]+$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Length in characters people see (an emoji counts once). */
const length = (s: string) => [...s].length;

export const normalizeUsername = (s: string) => s.trim();
export const normalizeEmail = (s: string) => s.trim().toLowerCase();

export function username(value: string): MessageKey | null {
  const v = normalizeUsername(value);
  if (v === '') return 'usernameEmpty';
  if (length(v) < LIMITS.username.min) return 'usernameShort';
  if (length(v) > LIMITS.username.max) return 'usernameLong';
  if (!USERNAME_START.test(v)) return 'usernameStart';
  if (!USERNAME_CHARS.test(v)) return 'usernameChars';
  return null;
}

/** Shape only; the server decides whether the address really exists. */
export function email(value: string): MessageKey | null {
  const v = normalizeEmail(value);
  if (v === '') return 'emailEmpty';
  if (length(v) > LIMITS.email.max || !EMAIL_SHAPE.test(v)) return 'emailInvalid';
  return null;
}

/**
 * Sign-up password. It is never trimmed or changed (pasting is allowed), so a space at either end is refused.
 * "Letter" is any Unicode letter; "digit" is 0-9.
 */
export function newPassword(value: string, who: { username?: string; email?: string } = {}): MessageKey | null {
  if (value === '') return 'passwordEmpty';
  if (value !== value.trim()) return 'passwordEdgeSpace';
  if (length(value) < LIMITS.password.min) return 'passwordShort';
  if (length(value) > LIMITS.password.max) return 'passwordLong';
  if (!/\p{L}/u.test(value) || !/[0-9]/.test(value)) return 'passwordComposition';
  const lower = value.toLowerCase();
  const sameAs = [who.username && normalizeUsername(who.username), who.email && normalizeEmail(who.email)];
  if (sameAs.some((x) => x && x.toLowerCase() === lower)) return 'passwordSameAsIdentity';
  return null;
}

export function repeatPassword(password: string, repeat: string): MessageKey | null {
  if (repeat === '') return 'passwordEmpty';
  return repeat === password ? null : 'passwordMismatch';
}

/** Sign-in checks that both fields are filled; password strength is not judged here. */
export function signIn(values: { email: string; password: string }): { email: MessageKey | null; password: MessageKey | null } {
  const mail = normalizeEmail(values.email);
  return {
    email: mail === '' ? 'emailEmpty' : EMAIL_SHAPE.test(mail) ? null : 'emailInvalid',
    password: values.password === '' ? 'passwordEmpty' : null,
  };
}
