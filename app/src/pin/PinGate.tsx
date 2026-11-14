import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { buzzLight } from '../a11y/haptics';
import { useAuth } from '../auth/AuthProvider';
import { fill, MESSAGES, UI } from '../forms/messages';
import { colors, fontSize, touchTarget } from '../theme';
import { attemptPin, getLock, hasPin } from './pinStore';
import { PinScreenBody, usePinInput } from './PinScreenBody';
import { usePinSession } from './PinSession';
import type { LockState } from './lock';

const FREE: LockState = { locked: false, secondsLeft: 0, triesLeft: 0 };

/** Shows `children` once the companion PIN has been entered; until then only the PIN pad (flow §7.7.2). */
export function PinGate({ children, headerless = false }: { children: ReactNode; /** True when no stack header sits above (the Pendamping tab): the pad pads the status bar itself. */ headerless?: boolean }) {
  const { uid, session } = useAuth();
  const router = useRouter();
  const { unlocked, unlock } = usePinSession();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [lock, setLock] = useState<LockState>(FREE);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  // Read the saved lock first: it survives closing the app.
  useEffect(() => {
    if (unlocked) return;
    let alive = true;
    void (async () => {
      const [has, state] = await Promise.all([hasPin(uid), getLock(uid)]);
      if (!alive) return;
      setPinSet(has);
      setLock(state);
    })();
    return () => {
      alive = false;
    };
  }, [uid, unlocked]);

  // The visible countdown.
  useEffect(() => {
    if (!lock.locked) return;
    const timer = setInterval(() => {
      void getLock(uid).then((s) => {
        setLock(s);
        if (!s.locked) setWrong(false);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lock.locked, uid]);

  const check = useCallback(
    async (pin: string) => {
      setBusy(true);
      try {
        const res = await attemptPin(uid, pin);
        if (res.ok) {
          setWrong(false);
          unlock();
          return;
        }
        buzzLight(); // follows the Getar switch; a light tap, never an error pattern (design §8)
        setWrong(true);
        setLock(res);
      } finally {
        setBusy(false);
        pad.clear();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, unlock],
  );
  const pad = usePinInput(check, busy || lock.locked);

  if (unlocked) return <>{children}</>;
  if (pinSet === null) return null;
  if (!pinSet) return <Redirect href="/auth/create-pin" />;

  const message = lock.locked
    ? fill(MESSAGES.pinLocked, { n: lock.secondsLeft })
    : wrong
      ? fill(MESSAGES.pinWrong, { n: lock.triesLeft })
      : null;
  return (
    <PinScreenBody
      headerless={headerless}
      title="Masukkan PIN Pendamping"
      filled={pad.digits.length}
      message={message}
      padDisabled={busy || lock.locked}
      onDigit={pad.onDigit}
      onDelete={pad.onDelete}
    >
      {/* A forgotten PIN is reset by proving the account password; without an account there is nothing to prove. */}
      {session ? (
        <Pressable
          onPress={() => router.push('/auth/forgot-pin')}
          accessibilityRole="link"
          accessibilityLabel={UI.forgotPin}
          style={styles.link}
          testID="forgot-pin"
        >
          <Text style={styles.linkText}>{UI.forgotPin}</Text>
        </Pressable>
      ) : null}
    </PinScreenBody>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'center' },
  linkText: { fontSize: fontSize.label, fontWeight: '700', color: colors.text, textDecorationLine: 'underline' },
});
