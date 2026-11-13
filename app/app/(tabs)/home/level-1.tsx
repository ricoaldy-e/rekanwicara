import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, StatusBadge, Title } from '../../../src/components';
import { toStored } from '../../../src/data/mappers';
import { lastStatus } from '../../../src/data/progress';
import { useCatalog } from '../../../src/data/useCatalog';
import { useSettings } from '../../../src/state/settings';
import { useUser } from '../../../src/state/user';
import { colors, fontSize, spacing, statusStyles } from '../../../src/theme';

export default function LevelOne() {
  const router = useRouter();
  const { apiUrl } = useSettings();
  const { profile } = useUser();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });

  return (
    <Screen>
      <Title>Level 1 · Bunyi vokal</Title>

      {loading && !data ? (
        <View style={styles.center} accessible accessibilityLabel="Memuat materi">
          <ActivityIndicator size="large" color={colors.text} />
          <Body>Memuat materi…</Body>
        </View>
      ) : null}

      {error ? (
        <View style={styles.gap}>
          <InfoNote tone="warning" text={errorMessage(error)} testID="level1-error" />
          <BigButton label="Coba lagi" icon="refresh" onPress={reload} disabled={loading} />
        </View>
      ) : null}

      {data?.level1.map((item) => {
        const status = lastStatus(profile.attempts, item.itemId);
        return (
          <Card
            key={item.key}
            testID={`item-${item.itemId}`}
            onPress={() => router.push({ pathname: '/practice/[itemId]', params: { itemId: item.itemId } })}
            accessibilityLabel={`${item.text}, ${status ? `terakhir ${statusStyles[toStored(status)].label}` : 'belum dicoba'}`}
          >
            <View style={styles.gap}>
              <Text maxFontSizeMultiplier={2} style={styles.word}>{item.text}</Text>
              {status ? (
                <StatusBadge status={toStored(status)} label="Terakhir" />
              ) : (
                <Text maxFontSizeMultiplier={2} style={styles.untried}>Belum dicoba</Text>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  word: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  untried: { fontSize: fontSize.small, color: colors.textMuted },
});
