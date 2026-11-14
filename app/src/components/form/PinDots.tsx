import { StyleSheet, View } from 'react-native';

import { fill, UI } from '../../forms/messages';
import { PIN_LENGTH } from '../../forms/validators/pin';
import { colors, pin } from '../../theme';

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
  row: { flexDirection: 'row', justifyContent: 'center', gap: pin.dotGap, paddingVertical: pin.dotPaddingVertical },
  // Filled = solid, empty = ring: the state is a shape, not only a colour.
  dot: { width: pin.dot, height: pin.dot, borderRadius: pin.dot / 2, borderWidth: pin.dotRing, borderColor: colors.border },
  filled: { backgroundColor: colors.primary, borderColor: colors.primary },
});
