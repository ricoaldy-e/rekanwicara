import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen } from '../src/components';
import { DATASET_MODE } from '../src/config';
import { groupByLevel, LEVEL_NAMES } from '../src/content/levels';
import { useContent } from '../src/state/content';
import { colors, fontSize, spacing } from '../src/theme';

export default function Home() {
  const router = useRouter();
  const { health, healthError, items, loading, error, reload } = useContent();

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
      <Body muted>Pilih satu materi untuk mulai berlatih.</Body>

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
              {group.items.map((item) => (
                <Card
                  key={item.item_id}
                  onPress={() => router.push({ pathname: '/practice/[itemId]', params: { itemId: item.item_id } })}
                  accessibilityLabel={`Latihan ${item.text}`}
                  accessibilityHint="Buka latihan"
                  testID={`item-${item.item_id}`}
                >
                  <View style={styles.itemRow}>
                    {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
                    <Text style={styles.itemText}>{item.text}</Text>
                  </View>
                </Card>
              ))}
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: fontSize.title },
  itemText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  footer: { gap: spacing.sm, marginTop: spacing.lg },
});
