import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { PIN_LIMITS } from '../forms/limits';

interface PinSessionValue {
  unlocked: boolean;
  unlock(): void;
  lock(): void;
  /** Call on every touch in the companion/settings area: restarts the idle timer. */
  touch(): void;
}

const PinSessionContext = createContext<PinSessionValue | null>(null);

/**
 * Whether the companion area is open (flow §5.5). It closes again when the app leaves the foreground,
 * when the Latihan tab is shown (the layout calls `lock`), or after `PIN_LIMITS.idleMs` without a touch.
 */
export function PinSessionProvider({ children, idleMs = PIN_LIMITS.idleMs }: { children: ReactNode; idleMs?: number }) {
  const [unlocked, setUnlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const lock = useCallback(() => {
    clear();
    setUnlocked(false);
  }, []);
  const touch = useCallback(() => {
    if (!timer.current) return; // only an open session has an idle timer
    clear();
    timer.current = setTimeout(lock, idleMs);
  }, [idleMs, lock]);
  const unlock = useCallback(() => {
    clear();
    timer.current = setTimeout(lock, idleMs);
    setUnlocked(true);
  }, [idleMs, lock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state !== 'active' && lock());
    return () => {
      sub.remove();
      clear();
    };
  }, [lock]);

  const value = useMemo(() => ({ unlocked, unlock, lock, touch }), [unlocked, unlock, lock, touch]);
  return <PinSessionContext.Provider value={value}>{children}</PinSessionContext.Provider>;
}

export function usePinSession(): PinSessionValue {
  const ctx = useContext(PinSessionContext);
  if (!ctx) throw new Error('usePinSession must be used inside PinSessionProvider');
  return ctx;
}
