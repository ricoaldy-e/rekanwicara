import { StyleSheet, View } from 'react-native';

import { fill, UI } from '../../forms/messages';
import { PIN_LENGTH } from '../../forms/validators/pin';
import { colors, spacing, stroke } from '../../theme';

const DOT = 20;

/** One accessibility element, "2 dari 4 angka terisi"; the digits are never read out or shown. */
export function PinDots({ filled, total = PIN_LENGTH }: { filled: number; total?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={fill(UI.pinDots, { n: filled, total })}
      accessibilityLiveRegion="polite"
      style={styles.row}
      testID="pin-dots"
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.filled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  // Filled = solid, empty = ring: the state is a shape, not only a colour.
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: stroke.thick, borderColor: colors.text },
  filled: { backgroundColor: colors.text },
});
