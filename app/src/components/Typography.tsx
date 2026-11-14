import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, displayFont, fontSize, lineHeight } from '../theme';

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, displayFont()]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.title, color: colors.text },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: lineHeight.body },
  muted: { color: colors.textMuted },
});
