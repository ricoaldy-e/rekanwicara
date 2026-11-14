import { useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
  headerless = false,
  instruction,
  filled,
  message,
  padDisabled,
  onDigit,
  onDelete,
  children,
  top,
  contentStyle,
}: {
  /** Row above the title (create PIN: back button and step). */
  top?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  title: string;
  headerless?: boolean;
  instruction?: string;
  filled: number;
  message?: string | null;
  padDisabled?: boolean;
  onDigit: (d: string) => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Screen edges={headerless ? ['top', 'bottom', 'left', 'right'] : undefined} contentStyle={[styles.content, contentStyle]}>
      {top}
      <Title>{title}</Title>
      {instruction ? <Body>{instruction}</Body> : null}
      <View style={styles.dots}>
        <PinDots filled={filled} />
      </View>
      {message ? <InfoNote tone="warning" text={message} testID="pin-message" /> : null}
      <View style={styles.spacer} />
      <PinPad onDigit={onDigit} onDelete={onDelete} disabled={padDisabled} />
      {children}
    </Screen>
  );
}

// The pad sits at the bottom (Figma 29:28, 50:160); the spacer takes the free height.
const styles = StyleSheet.create({ content: { flexGrow: 1 }, dots: { paddingVertical: spacing.md }, spacer: { flex: 1 } });
