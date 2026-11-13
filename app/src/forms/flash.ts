import { useSyncExternalStore } from 'react';

/** A one-line message that the next screen shows as a snackbar (e.g. "PIN diganti." after going back). */
let message: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showFlash(text: string | null): void {
  message = text;
  emit();
}

/** [current message, clear]. */
export function useFlash(): [string | null, () => void] {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
  );
  return [current, () => showFlash(null)];
}
