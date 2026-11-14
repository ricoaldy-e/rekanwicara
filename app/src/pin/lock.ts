/** Pure decisions about the PIN lock, so they can be tested without a keystore or a clock. */
import { PIN_LIMITS } from '../forms/limits';

export interface LockData {
  failures: number;
  /** Epoch ms until which the pad is locked; 0 = not locked. */
  lockedUntil: number;
}

export interface LockState {
  locked: boolean;
  secondsLeft: number;
  triesLeft: number;
}

export const NO_FAILURES: LockData = { failures: 0, lockedUntil: 0 };

/** Reading never changes anything: the same data and time always give the same state. */
export function lockState(failures: number, lockedUntil: number, now: number): LockState {
  const remaining = lockedUntil - now;
  return {
    locked: remaining > 0,
    secondsLeft: remaining > 0 ? Math.ceil(remaining / 1000) : 0,
    triesLeft: Math.max(PIN_LIMITS.maxFailures - failures, 0),
  };
}

/** One more wrong PIN. The last allowed one starts the lock and gives a fresh set of tries afterwards. */
export function afterFailure(data: LockData, now: number): LockData {
  const failures = data.failures + 1;
  return failures >= PIN_LIMITS.maxFailures ? { failures: 0, lockedUntil: now + PIN_LIMITS.lockMs } : { failures, lockedUntil: data.lockedUntil };
}

/** Parses saved lock data; anything damaged counts as "no failures". */
export function parseLock(raw: string | null): LockData {
  try {
    const v = JSON.parse(raw ?? '') as Partial<LockData>;
    if (Number.isFinite(v.failures) && Number.isFinite(v.lockedUntil) && v.failures! >= 0 && v.lockedUntil! >= 0) {
      return { failures: v.failures!, lockedUntil: v.lockedUntil! };
    }
  } catch {
    // fall through
  }
  return NO_FAILURES;
}
