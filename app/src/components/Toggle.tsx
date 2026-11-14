import { Pressable, StyleSheet, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, radius, stroke, toggle } from '../theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
}

/** iOS-style switch, the same on every platform (design.md §5.8). The state is also written out by the caller ("Aktif" / "Mati"). */
export function Toggle({ value, onValueChange, accessibilityLabel, testID }: ToggleProps) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={toggle.hit}
      onPress={() => onValueChange(!value)}
      {...focusProps}
      style={[styles.track, value ? styles.on : styles.off, focusStyle]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: toggle.width, height: toggle.height, borderRadius: radius.pill, padding: toggle.inset - stroke.hairline, borderWidth: stroke.hairline, justifyContent: 'center' },
  on: { backgroundColor: colors.success, borderColor: colors.success },
  off: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  thumb: { width: toggle.thumb, height: toggle.thumb, borderRadius: radius.pill, backgroundColor: colors.primary, alignSelf: 'flex-start' },
  thumbOn: { alignSelf: 'flex-end' },
});
