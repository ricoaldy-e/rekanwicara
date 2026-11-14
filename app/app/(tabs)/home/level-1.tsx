import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { errorMessage } from '../../../src/api/errors';
import { LoadingView, BigButton, Body, InfoNote, LetterTile, ListGroup, ListRow, ProgressRing, Screen, StatusBadge, UntriedBadge } from '../../../src/components';
import { describeItem, lastStatus, summary } from '../../../src/data/progress';
import { useCatalog } from '../../../src/data/useCatalog';
import { fraction } from '../../../src/state/homeStats';
import { useSettings } from '../../../src/state/settings';
import { useUser } from '../../../src/state/user';
import { colors, displayFont, fontSize, layout, lineHeight, radius, spacing, statusStyles, stroke, textFont, wordList } from '../../../src/theme';

/** Static copy for the built-in sounds (Figma 37:287). Unknown ids simply show no hint. */
const SOUND: Record<string, { hint: string; tile?: string; icon?: ComponentProps<typeof Ionicons>['name'] }> = {
  l1_a: { hint: 'Bibir terbuka' },
  l1_i: { hint: 'Bibir melebar' },
  l1_u: { hint: 'Bibir membulat' },
  l0_hold_a: { hint: 'Tahan suara', tile: 'a~' },
  l0_soft_loud: { hint: 'Atur volume', icon: 'volume-medium-outline' },
};

export default function LevelOne() {
  const router = useRouter();
  const { apiUrl } = useSettings();
  const { profile } = useUser();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });
  const progress = data ? summary(profile.attempts, data.level1.map((i) => i.itemId)) : null;

  return (
    <Screen contentStyle={styles.content}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>Level 1 · Bunyi vokal</Text>

      {loading && !data ? <LoadingView label="Memuat materi" text="Memuat materi…" /> : null}

      {error ? (
        <View style={styles.gap}>
          <InfoNote tone="warning" text={errorMessage(error)} testID="level1-error" />
          <BigButton label="Coba lagi" icon="refresh" onPress={reload} disabled={loading} />
        </View>
      ) : null}

      {progress ? (
        <View
          testID="level1-progress"
          accessible
          accessibilityLabel={`Kemajuan vokal. ${progress.done} dari ${progress.total} bunyi sesuai`}
          style={styles.banner}
        >
          <View style={styles.bannerText}>
            <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.label, textFont(true)]}>Kemajuan vokal</Text>
            <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>
              {progress.done} dari {progress.total} bunyi sesuai
            </Text>
          </View>
          <ProgressRing value={fraction(progress.done, progress.total)} size={wordList.bannerRing} />
        </View>
      ) : null}

      {data ? (
        <ListGroup title="Pilih Bunyi Latihan">
          {data.level1.map((item) => {
            const status = lastStatus(profile.attempts, item.itemId);
            const d = describeItem(1, item.itemId, item.text);
            const extra = SOUND[item.itemId];
            return (
              <ListRow
                key={item.key}
                testID={`item-${item.itemId}`}
                title={d.title}
                subtitle={extra?.hint}
                leading={<LetterTile letter={extra?.tile ?? d.letter} icon={extra?.icon} large />}
                trailing={status ? <StatusBadge status={status} /> : <UntriedBadge />}
                chevron={false}
                onPress={() => router.push({ pathname: '/practice/[itemId]', params: { itemId: item.itemId } })}
                accessibilityLabel={`${item.text}, ${status ? `terakhir ${statusStyles[status].label}` : 'belum dicoba'}`}
              />
            );
          })}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: layout.sectionGap },
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.sectionGap,
    padding: wordList.banner,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  bannerText: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  label: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
