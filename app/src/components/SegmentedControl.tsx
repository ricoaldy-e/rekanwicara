import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, segmented, stroke, textFont } from '../theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the whole group, e.g. "Filter kata". */
  accessibilityLabel?: string;
  testID?: string;
}

/** Short filter switch (design.md §5.7, Figma 37:399). Selected = cream fill + bold dark text, not color alone. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, testID }: SegmentedControlProps<T>) {
  return (
    <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      {options.map((o) => (
        <Segment key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} testID={testID ? `${testID}-${o.value}` : undefined} />
      ))}
    </View>
  );
}

function Segment({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      {...focusProps}
      style={({ pressed }) => [styles.segment, selected && styles.selected, !selected && pressed && styles.pressed, focusStyle]}
    >
      <Text
        maxFontSizeMultiplier={2}
        numberOfLines={1}
        style={[styles.label, textFont(true), { color: selected ? colors.onPrimary : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: segmented.gap,
    padding: segmented.padding,
    borderRadius: segmented.radius,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minWidth: 1,
    minHeight: segmented.segmentHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: segmented.padding,
    borderRadius: segmented.segmentRadius,
  },
  selected: { backgroundColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceRaised },
  label: { fontSize: segmented.fontSize, lineHeight: segmented.lineHeight },
});
