import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, SourceChip, Title } from '../../../../src/components';
import { bestStatus } from '../../../../src/data/progress';
import { useCatalog } from '../../../../src/data/useCatalog';
import { useSettings } from '../../../../src/state/settings';
import { useUser } from '../../../../src/state/user';
import { colors, fontSize, spacing } from '../../../../src/theme';

export default function Words() {
  const router = useRouter();
  const { apiUrl } = useSettings();
  const { profile } = useUser();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });

  return (
    <Screen>
      <Title>Pilih kata</Title>

      {loading && !data ? (
        <View style={styles.center} accessible accessibilityLabel="Memuat kata">
          <ActivityIndicator size="large" color={colors.text} />
          <Body>Memuat kata…</Body>
        </View>
      ) : null}

      {error ? (
        <View style={styles.gap}>
          <InfoNote tone="warning" text={errorMessage(error)} testID="words-error" />
          <BigButton label="Coba lagi" icon="refresh" onPress={reload} disabled={loading} />
        </View>
      ) : null}

      {data && data.words.length === 0 ? <InfoNote text="Belum ada kata." testID="words-empty" /> : null}

      {data?.words.map((w) => {
        // shortcut: the Level 2 count needs getWord per word (N requests on v2), so only Level 3 is summarised here.
        const l3 = bestStatus(profile.attempts, w.id) === 'sesuai' ? 'sesuai' : 'belum';
        return (
          <Card
            key={w.id}
            testID={`word-${w.id}`}
            onPress={() => router.push({ pathname: '/home/words/[wordId]', params: { wordId: w.id } })}
            accessibilityLabel={`${w.text}, ${w.source === 'default' ? 'bawaan' : 'dari Pendamping'}, Level 3: ${l3}`}
          >
            <View style={styles.gap}>
              <Text maxFontSizeMultiplier={2} style={styles.word}>{w.text}</Text>
              <SourceChip source={w.source} />
              <Text maxFontSizeMultiplier={2} style={styles.summary}>Level 3: {l3}</Text>
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
  summary: { fontSize: fontSize.small, color: colors.textMuted },
});
