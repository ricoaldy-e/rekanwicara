import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, InfoNote, Screen, Title } from '../components';
import { PinDots } from '../components/form/PinDots';
import { PinPad } from '../components/form/PinPad';
import { spacing } from '../theme';
import { PIN_LENGTH } from '../forms/validators/pin';

/**
 * Digits typed on the PIN pad. `onComplete` gets the PIN at the 4th digit (no OK button); the caller
 * then calls `clear()` or moves on. The digits live only in this state: never logged, never shown.
 */
export function usePinInput(onComplete: (pin: string) => void, disabled = false) {
  const [digits, setDigits] = useState('');
  const onDigit = useCallback(
    (d: string) => {
      if (disabled || digits.length >= PIN_LENGTH) return;
      const next = digits + d;
      setDigits(next);
      if (next.length === PIN_LENGTH) onComplete(next);
    },
    [digits, disabled, onComplete],
  );
  const onDelete = useCallback(() => setDigits((x) => x.slice(0, -1)), []);
  const clear = useCallback(() => setDigits(''), []);
  return { digits, onDigit, onDelete, clear };
}

/** One instruction, four dots, an optional message and the pad: shared by create, gate and change PIN. */
export function PinScreenBody({
  title,
  instruction,
  filled,
  message,
  padDisabled,
  onDigit,
  onDelete,
  children,
}: {
  title: string;
  instruction?: string;
  filled: number;
  message?: string | null;
  padDisabled?: boolean;
  onDigit: (d: string) => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Screen>
      <Title>{title}</Title>
      {instruction ? <Body>{instruction}</Body> : null}
      <View style={styles.dots}>
        <PinDots filled={filled} />
      </View>
      {message ? <InfoNote tone="warning" text={message} testID="pin-message" /> : null}
      <PinPad onDigit={onDigit} onDelete={onDelete} disabled={padDisabled} />
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({ dots: { paddingVertical: spacing.md } });
