import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, SourceChip, Title } from '../../../../src/components';
import { bestStatus, summary } from '../../../../src/data/progress';
import type { WordSummary } from '../../../../src/data/types';
import { useCatalog, useWordPath } from '../../../../src/data/useCatalog';
import { useSettings } from '../../../../src/state/settings';
import { useUser } from '../../../../src/state/user';
import type { Attempt } from '../../../../src/user/pure';
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

      {data?.words.map((w) => (
        <WordCard key={w.id} word={w} apiUrl={apiUrl} attempts={profile.attempts} onPress={() => router.push({ pathname: '/home/words/[wordId]', params: { wordId: w.id } })} />
      ))}
    </Screen>
  );
}

/** One word: name, source and progress. The Level 2 count needs the word's syllables, loaded for this card only. */
function WordCard({ word: w, apiUrl, attempts, onPress }: { word: WordSummary; apiUrl: string; attempts: readonly Attempt[]; onPress: () => void }) {
  const path = useWordPath(w.id, { baseUrl: apiUrl });
  const l3 = bestStatus(attempts, w.id) === 'sesuai' ? 'sesuai' : 'belum';
  // While the syllables load, or when they cannot be loaded, only Level 3 is told (never a wrong Level 2 number).
  const l2 = w.hasLevel2 && path.data ? summary(attempts, path.data.syllables.map((s) => s.itemId)) : null;
  const text = `${l2 ? `Level 2: ${l2.done} dari ${l2.total} sesuai · ` : ''}Level 3: ${l3}`;
  return (
    <Card
      testID={`word-${w.id}`}
      onPress={onPress}
      accessibilityLabel={`${w.text}, ${w.source === 'default' ? 'bawaan' : 'dari Pendamping'}, ${text}`}
    >
      <View style={styles.gap}>
        <Text maxFontSizeMultiplier={2} style={styles.word}>{w.text}</Text>
        <SourceChip source={w.source} />
        <Text maxFontSizeMultiplier={2} style={styles.summary}>{text}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  word: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  summary: { fontSize: fontSize.small, color: colors.textMuted },
});
