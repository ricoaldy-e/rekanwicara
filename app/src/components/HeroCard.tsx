import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextProps } from 'react-native';

import { colors, displayFont, fontSize, radius, spacing } from '../theme';

export interface HeroCardProps {
  title: string;
  body?: string;
  /** Normally one primary BigButton. */
  children?: ReactNode;
  testID?: string;
  /** Extra props for the title, e.g. onLongPress hooks. */
  titleProps?: TextProps;
}

/** The one featured card per screen (design.md §5.2). */
export function HeroCard({ title, body, children, testID, titleProps }: HeroCardProps) {
  return (
    <View testID={testID} style={styles.card}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} {...titleProps} style={[styles.title, displayFont()]}>
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.hero, borderRadius: radius.card, padding: 20, gap: spacing.sm },
  title: { fontSize: fontSize.title, color: colors.onHero },
  body: { fontSize: fontSize.body, color: colors.onHeroMuted },
});
