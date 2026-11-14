import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextProps } from 'react-native';

import { colors, displayFont, fontSize, layout, lineHeight, radius, spacing, textFont } from '../theme';

export interface HeroCardProps {
  title: string;
  /** Small line above the title, e.g. "Lanjutkan latihan". */
  eyebrow?: string;
  body?: string;
  /** Drawn on the right of the text, e.g. a LipIllustration with tone="hero". */
  illustration?: ReactNode;
  /** Normally one primary BigButton. */
  children?: ReactNode;
  testID?: string;
  /** Extra props for the title, e.g. onLongPress hooks. */
  titleProps?: TextProps;
}

/** The one featured card per screen (design.md §5.3, Figma 57:405). */
export function HeroCard({ title, eyebrow, body, illustration, children, testID, titleProps }: HeroCardProps) {
  return (
    <View testID={testID} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          {eyebrow ? (
            <Text maxFontSizeMultiplier={2} style={[styles.small, textFont()]}>
              {eyebrow}
            </Text>
          ) : null}
          <Text accessibilityRole="header" maxFontSizeMultiplier={2} {...titleProps} style={[styles.title, displayFont()]}>
            {title}
          </Text>
          {body ? (
            <Text maxFontSizeMultiplier={2} style={[styles.small, textFont()]}>
              {body}
            </Text>
          ) : null}
        </View>
        {illustration}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.hero, borderRadius: radius.card, padding: layout.gutter, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  text: { flex: 1, minWidth: 1, gap: spacing.xs },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.onHero },
  small: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.onHeroMuted },
});
