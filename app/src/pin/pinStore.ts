/**
 * The companion PIN, per account, in the device keystore (kontrak §2, §3). It is a screen lock to keep
 * settings from changing by accident, not strong security. It never leaves the phone and is never logged.
 * SecureStore keys may not contain ":", so the kontrak's `rw.companionPin:<uid>` is written `rw.companionPin.<uid>`.
 */
import * as SecureStore from 'expo-secure-store';

import { afterFailure, lockState, NO_FAILURES, parseLock, type LockData, type LockState } from './lock';

/** No account yet (FL-7): the PIN belongs to this phone. */
export const LOCAL_UID = 'local';

const LEGACY_KEY = 'cw.companionPin'; // before FL-6 one PIN per phone
const pinKey = (uid: string) => `rw.companionPin.${uid}`;
const lockKey = (uid: string) => `rw.pinLock.${uid}`;

/** Copies the old single PIN to this account once, then removes it. */
async function migrateLegacy(uid: string): Promise<void> {
  if ((await SecureStore.getItemAsync(pinKey(uid))) !== null) return;
  const old = await SecureStore.getItemAsync(LEGACY_KEY);
  if (old === null) return;
  await SecureStore.setItemAsync(pinKey(uid), old);
  await SecureStore.deleteItemAsync(LEGACY_KEY);
}

export async function hasPin(uid: string): Promise<boolean> {
  await migrateLegacy(uid);
  return (await SecureStore.getItemAsync(pinKey(uid))) !== null;
}

export async function savePin(uid: string, pin: string): Promise<void> {
  await SecureStore.setItemAsync(pinKey(uid), pin);
  await clearFailures(uid);
}

export async function verifyPin(uid: string, pin: string): Promise<boolean> {
  await migrateLegacy(uid);
  return (await SecureStore.getItemAsync(pinKey(uid))) === pin;
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
