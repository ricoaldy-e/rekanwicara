import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, StatusBadge } from '../src/components';
import { DATASET_MODE } from '../src/config';
import { groupByLevel, LEVEL_NAMES } from '../src/content/levels';
import { useContent } from '../src/state/content';
import { useUser } from '../src/state/user';
import { lastStatus, pickMission } from '../src/user/pure';
import { colors, fontSize, spacing } from '../src/theme';

export default function Home() {
  const router = useRouter();
  const { health, healthError, items, loading, error, reload } = useContent();
  const { profile } = useUser();
  const mission = items ? pickMission(items, profile.attempts) : null;
  const open = (itemId: string) => router.push({ pathname: '/practice/[itemId]', params: { itemId } });

  return (
    <Screen>
      {/* Hidden Settings: long-press the title for 2 s (for demo setup). */}
      <Pressable
        onLongPress={() => router.push('/settings')}
        delayLongPress={2000}
        accessibilityRole="header"
        accessibilityLabel="Misi hari ini"
      >
        <Text style={styles.title}>Misi hari ini</Text>
      </Pressable>

      {!profile.calibrated ? (
        <View style={styles.gap}>
          <InfoNote text="Kalibrasi belum dilakukan. Dengan kalibrasi, hasil latihan lebih tepat untukmu." testID="calibration-banner" />
          <BigButton label="Kalibrasi sekarang" icon="options" onPress={() => router.push('/calibration')} />
        </View>
      ) : null}

      {mission ? (
        <Card onPress={() => open(mission.item_id)} accessibilityLabel={`Misi hari ini: latihan ${mission.text}`} testID="mission">
          <Text style={styles.missionLabel}>Misi hari ini</Text>
          <View style={styles.itemRow}>
            {mission.emoji ? <Text style={styles.emoji}>{mission.emoji}</Text> : null}
            <Text style={styles.itemText}>{mission.text}</Text>
          </View>
          <Body muted>Tekan untuk mulai berlatih.</Body>
        </Card>
      ) : (
        <Body muted>Pilih satu materi untuk mulai berlatih.</Body>
      )}

      {health?.mock_mode ? <InfoNote text="Server dalam mode contoh (mock). Hasil bukan analisis sebenarnya." /> : null}
      {healthError && !error ? <InfoNote tone="warning" text={errorMessage(healthError)} /> : null}

      {loading && !items ? (
        <View style={styles.center} accessible accessibilityLabel="Memuat materi">
          <ActivityIndicator size="large" color={colors.primary} />
          <Body>Memuat materi…</Body>
        </View>
      ) : null}

      {error ? (
        <View style={styles.gap}>
          <InfoNote tone="warning" text={errorMessage(error)} testID="home-error" />
          <BigButton label="Coba lagi" icon="refresh" onPress={reload} disabled={loading} />
        </View>
      ) : null}

      {items
        ? groupByLevel(items).map((group) => (
            <View key={group.level} style={styles.gap}>
              <Text accessibilityRole="header" style={styles.levelTitle}>
                Level {group.level}: {LEVEL_NAMES[group.level] ?? ''}
              </Text>
              {group.items.map((item) => {
                const last = lastStatus(profile.attempts, item.item_id);
                return (
                  <Card
                    key={item.item_id}
                    onPress={() => open(item.item_id)}
                    accessibilityLabel={`Latihan ${item.text}`}
                    accessibilityHint="Buka latihan"
                    testID={`item-${item.item_id}`}
                  >
                    <View style={styles.itemRow}>
                      {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
                      <Text style={styles.itemText}>{item.text}</Text>
                    </View>
                    {last ? <StatusBadge status={last} label="Terakhir" /> : <Body muted>Belum dicoba</Body>}
                  </Card>
                );
              })}
            </View>
          ))
        : null}

      <View style={styles.footer}>
        <BigButton
          label="Mode Pendamping"
          icon="people"
          variant="secondary"
          onPress={() => router.push('/companion')}
        />
        {DATASET_MODE ? (
          <BigButton label="Mode Dataset" icon="videocam" variant="secondary" onPress={() => router.push('/dataset')} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  levelTitle: { fontSize: fontSize.large, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  gap: { gap: spacing.sm },
  missionLabel: { fontSize: fontSize.small, fontWeight: '800', color: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: fontSize.title },
  itemText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  footer: { gap: spacing.sm, marginTop: spacing.lg },
});
