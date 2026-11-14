/**
 * The companion PIN, per account, in the device keystore (kontrak §2, §3). It is a screen lock to keep
 * settings from changing by accident, not strong security. It never leaves the phone and is never logged.
 * Uses the existing cw.companionPin account key; shared legacy PINs are never assigned to an account.
 */
import * as SecureStore from 'expo-secure-store';

import {
  authorizePinReset as authorizeReset, changePin as replacePin, hasPin as accountHasPin,
  resetPin, savePin as createPin, verifyPin as accountVerifyPin,
} from '../user/storage';

import { afterFailure, lockState, NO_FAILURES, parseLock, type LockData, type LockState } from './lock';

/** No account yet (FL-7): the PIN belongs to this phone. */
export const LOCAL_UID = 'local';

const lockKey = (uid: string) => `rw.pinLock.${uid}`;

export async function hasPin(uid: string): Promise<boolean> {
  return accountHasPin(uid);
}

export async function savePin(uid: string, pin: string): Promise<void> {
  if (await accountHasPin(uid)) await resetPin(pin, uid);
  else await createPin(pin, uid);
  await clearFailures(uid);
}

export async function changePin(uid: string, currentPin: string, nextPin: string): Promise<void> {
  await replacePin(currentPin, nextPin, uid);
  await clearFailures(uid);
}

export async function authorizePinReset(uid: string, password: string): Promise<void> {
  return authorizeReset(password, uid);
}

export async function verifyPin(uid: string, pin: string): Promise<boolean> {
  return accountVerifyPin(pin, uid);
}

async function readLock(uid: string): Promise<LockData> {
  return parseLock(await SecureStore.getItemAsync(lockKey(uid)));
}

export async function getLock(uid: string, now = Date.now()): Promise<LockState> {
  const data = await readLock(uid);
  return lockState(data.failures, data.lockedUntil, now);
}

/** Counts a wrong PIN and returns the new state (locked after the fifth). Kept across app restarts. */
export async function recordFailure(uid: string, now = Date.now()): Promise<LockState> {
  const next = afterFailure(await readLock(uid), now);
  await SecureStore.setItemAsync(lockKey(uid), JSON.stringify(next));
  return lockState(next.failures, next.lockedUntil, now);
}

export async function clearFailures(uid: string): Promise<void> {
  await SecureStore.setItemAsync(lockKey(uid), JSON.stringify(NO_FAILURES));
}

export type PinAttempt = { ok: true } | ({ ok: false } & LockState);

/** Checks a PIN while honouring the lock: a locked pad never reaches the keystore comparison. */
export async function attemptPin(uid: string, pin: string, now = Date.now()): Promise<PinAttempt> {
  const before = await getLock(uid, now);
  if (before.locked) return { ok: false, ...before };
  if (await verifyPin(uid, pin)) {
    await clearFailures(uid);
    return { ok: true };
  }
  return { ok: false, ...(await recordFailure(uid, now)) };
}
