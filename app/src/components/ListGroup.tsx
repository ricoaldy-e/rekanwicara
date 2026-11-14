import Ionicons from '@expo/vector-icons/Ionicons';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, fontSize, listGroup, radius, stroke, textFont } from '../theme';

export interface ListGroupProps {
  /** Section heading above the card (label 16 Bold). */
  title?: string;
  /** Muted text at the right of the heading, e.g. "1 dari 3". */
  titleTrailing?: string;
  /** Left offset of the dividers; defaults to 56 (under the text, after a 44 dp tile). */
  inset?: number;
  /** Vertical padding inside the card; defaults to 2. */
  paddingVertical?: number;
  /** Right padding inside the card; defaults to 12 (room for a chevron). */
  paddingRight?: number;
  children: ReactNode;
  testID?: string;
}

/** iOS-style group: one card, rows separated by an inset hairline (design.md §5.3, Figma 50:421). */
export function ListGroup({ title, titleTrailing, inset = listGroup.inset, paddingVertical = listGroup.paddingVertical, paddingRight = listGroup.paddingRight, children, testID }: ListGroupProps) {
  const rows = Children.toArray(children);
  return (
    <View testID={testID} style={styles.group}>
      {title ? (
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={[styles.heading, textFont(true)]}>{title}</Text>
          {titleTrailing ? <Text style={[styles.trailingText, textFont()]}>{titleTrailing}</Text> : null}
        </View>
      ) : null}
      <View style={[styles.card, { paddingVertical, paddingRight }]}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View testID="list-separator" style={[styles.separator, { marginLeft: inset }]} /> : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Left slot, e.g. a letter tile. */
  leading?: ReactNode;
  /** Right slot, e.g. a StatusBadge. Replaced by nothing else: the chevron shows only when `onPress` is set. */
  trailing?: ReactNode;
  /** Makes the row pressable and shows `›`. */
  onPress?: () => void;
  /** Vertical padding of the row; defaults to 12. */
  paddingVertical?: number;
  /** Not available yet: title and subtitle in `textMuted`. */
  muted?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function ListRow({ title, subtitle, leading, trailing, onPress, paddingVertical = listGroup.rowPaddingVertical, muted = false, accessibilityLabel, testID }: ListRowProps) {
  const { focusProps, focusStyle } = useFocusRing();
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text style={[styles.title, textFont(true), muted && styles.mutedText]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, textFont()]}>{subtitle}</Text> : null}
      </View>
      {trailing}
      {onPress ? <Ionicons name="chevron-forward" size={listGroup.chevron} color={colors.textMuted} accessible={false} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)} style={[styles.row, { paddingVertical }]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      {...focusProps}
      style={({ pressed }) => [styles.row, { paddingVertical }, pressed && styles.pressed, focusStyle]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: listGroup.titleGap },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: listGroup.rowGap },
  heading: { fontSize: fontSize.label, lineHeight: 22, color: colors.text },
  trailingText: { fontSize: fontSize.small, lineHeight: 22, color: colors.textMuted },
  card: {
    paddingLeft: listGroup.paddingLeft,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  // Divider starts under the text, not under the leading tile.
  separator: { height: stroke.hairline, backgroundColor: colors.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: listGroup.rowGap },
  pressed: { backgroundColor: colors.surfaceRaised },
  text: { flex: 1, minWidth: 1, gap: listGroup.textGap },
  title: { fontSize: fontSize.label, lineHeight: 22, color: colors.text },
  mutedText: { color: colors.textMuted },
  subtitle: { fontSize: fontSize.small, lineHeight: 22, color: colors.textMuted },
});
