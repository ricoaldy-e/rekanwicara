import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { Source } from '../api/types';
import { colors, fontSize, radius, spacing } from '../theme';

/** Where a word comes from: the team ("Bawaan") or the companion ("Dari Pendamping"). Icon + text, not a capsule. */
export function SourceChip({ source }: { source: Source }) {
  const builtIn = source === 'default';
  return (
    <View style={styles.chip}>
      <Ionicons name={builtIn ? 'lock-closed-outline' : 'person-outline'} size={16} color={colors.textMuted} accessible={false} />
      <Text maxFontSizeMultiplier={2} style={styles.text}>{builtIn ? 'Bawaan' : 'Dari Pendamping'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
  },
  text: { fontSize: fontSize.small, color: colors.textMuted },
});
