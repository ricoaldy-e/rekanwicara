/** Pure PIN rules (flow §7.7.2). A PIN is only a lock on the screen, not strong security. */

export const PIN_LENGTH = 4;

export const isFourDigits = (pin: string) => /^[0-9]{4}$/.test(pin);

/** Four equal digits, or four digits in a row going up or down (1234, 0123, 4321, 9876). */
export function isWeakPin(pin: string): boolean {
  if (!isFourDigits(pin)) return false;
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((x, i) => x - d[i]);
  return steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

export const sameAsOld = (oldPin: string, newPin: string) => oldPin === newPin;
