import { StyleSheet, Text, View } from 'react-native';

import { colors, displayFont, fontSize, lineHeight, session, spacing, textFont } from '../theme';
import { BackButton } from './BackButton';

export interface SessionHeaderProps {
  step: number;
  total: number;
  /** Page title under the bar, e.g. "Ucapkan “a”". */
  title: string;
  onBack: () => void;
  /** Names the destination of the back button (design.md §5.2). */
  backLabel?: string;
}

/** Practice header (design.md §6.4, Figma 46:135): back capsule + "Langkah n dari N", segmented bar, serif title. */
export function SessionHeader({ step, total, title, onBack, backLabel = 'Keluar latihan' }: SessionHeaderProps) {
  const stepText = `Langkah ${step} dari ${total}`;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <BackButton label={backLabel} onPress={onBack} testID="session-back" />
        <Text accessibilityLabel={stepText} maxFontSizeMultiplier={2} style={[styles.step, textFont()]}>
          {stepText}
        </Text>
      </View>
      {/* Decorative: the text above carries the step. */}
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.bars} testID="session-bars">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.bar, i < step ? styles.barDone : styles.barTodo]} />
        ))}
      </View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  step: { flexShrink: 1, fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'right' },
  bars: { flexDirection: 'row', gap: session.stepBar.gap },
  bar: { flex: 1, minWidth: 1, height: session.stepBar.height, borderRadius: session.stepBar.height / 2 },
  barDone: { backgroundColor: colors.text },
  barTodo: { backgroundColor: colors.surfaceRaised },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
});
