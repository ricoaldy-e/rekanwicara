import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, layout, lineHeight, spacing, stroke, textFont } from '../theme';

/** A titled section of Tentang and Kebijakan privasi; sections after the first are separated by a thin line (Figma 51:558). */
export function InfoSection({ title, first = false, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, !first && styles.line]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, textFont(true)]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingVertical: layout.sectionGap },
  line: { borderTopWidth: stroke.hairline, borderTopColor: colors.surfaceRaised },
  title: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
});
