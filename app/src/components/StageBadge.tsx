import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Stage } from '../state/progression';
import { colors, fontSize, radius, spacing } from '../theme';

const STAGES: Record<Stage, { label: string; icon: ComponentProps<typeof Ionicons>['name'] }> = {
  terkunci: { label: 'Terkunci', icon: 'lock-closed' },
  berlatih: { label: 'Berlatih', icon: 'barbell' },
  lulus: { label: 'Lulus', icon: 'trophy' },
  ulasan: { label: 'Waktunya ulasan', icon: 'refresh-circle' },
  macet: { label: 'Butuh bantuan', icon: 'help-circle' },
};

export const stageLabel = (stage: Stage) => STAGES[stage].label;

/** Where a material stands (SPEC §8.4): icon + text, never colour alone. */
export function StageBadge({ stage, testID }: { stage: Stage; testID?: string }) {
  const s = STAGES[stage];
  return (
    <View testID={testID} accessible accessibilityLabel={`Tahap: ${s.label}`} style={styles.badge}>
      <Ionicons name={s.icon} size={22} color={colors.primary} />
      <Text style={styles.text}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.infoBg,
  },
  text: { fontSize: fontSize.small, fontWeight: '700', color: colors.primary },
});
