import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme';

export interface InfoNoteProps {
  text: string;
  tone?: 'info' | 'warning';
  testID?: string;
}

export function InfoNote({ text, tone = 'info', testID }: InfoNoteProps) {
  const warning = tone === 'warning';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      style={[styles.box, warning && styles.warning]}
    >
      <Ionicons
        name={warning ? 'warning' : 'information-circle'}
        size={28}
        color={warning ? colors.danger : colors.text}
      />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.infoBg,
  },
  warning: { borderColor: colors.danger, backgroundColor: colors.warningBg },
  text: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 28 },
});
