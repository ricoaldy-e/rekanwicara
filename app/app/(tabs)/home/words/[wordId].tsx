import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../../../src/api/apiError';
import { errorMessage } from '../../../../src/api/errors';
import { BigButton, Card, InfoNote, Screen, SourceChip, StatusBadge, Title } from '../../../../src/components';
import { canAnalyze } from '../../../../src/data/analyze';
import { bestStatus } from '../../../../src/data/progress';
import type { PracticeItem } from '../../../../src/data/types';
import { useWordPath } from '../../../../src/data/useCatalog';
import { useSettings } from '../../../../src/state/settings';
import { useUser } from '../../../../src/state/user';
import { colors, fontSize, spacing, statusStyles } from '../../../../src/theme';

export default function WordPath() {
  const router = useRouter();
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const { apiUrl } = useSettings();
  const { profile } = useUser();
  const { data: path, loading, error, reload } = useWordPath(wordId, { baseUrl: apiUrl });

  if (!path) {
    const missing = error instanceof ApiError && error.kind === 'http' && error.status !== null && error.status >= 400 && error.status < 500;
    return (
      <Screen>
        {loading ? (
          <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat kata" />
        ) : error && !missing ? (
          <>
            <InfoNote tone="warning" text={errorMessage(error)} testID="word-error" />
            <BigButton label="Coba lagi" icon="refresh" onPress={reload} />
          </>
        ) : (
          <>
            <InfoNote tone="warning" text="Materi tidak ditemukan." testID="word-not-found" />
            <BigButton label="Kembali" variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </Screen>
    );
  }

  const steps = [...path.syllables, path.whole];
  // "Berikutnya": the first step (Level 2 then Level 3) whose best status is not yet sesuai. Order is a hint, nothing is locked.
  const next = steps.find((s) => bestStatus(profile.attempts, s.itemId) !== 'sesuai')?.key;

  const open = (s: PracticeItem) =>
    router.push({
      pathname: '/practice/[itemId]',
      params: { itemId: s.itemId, wordId: path.word.id, ...(s.position === undefined ? {} : { position: String(s.position) }) },
    });

  const stepCard = (s: PracticeItem, k: number) => {
    const status = bestStatus(profile.attempts, s.itemId);
    return (
      <Card
        key={`${s.key}-${k}`}
        testID={`step-${s.key}`}
        onPress={() => open(s)}
        accessibilityLabel={`${s.text}, Level ${s.level}, ${status ? `terbaik ${statusStyles[status].label}` : 'belum dicoba'}${s.key === next ? ', berikutnya' : ''}`}
      >
        <View style={styles.gap}>
          {s.key === next ? (
            <View style={styles.next} testID="next-marker">
              <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.text} accessible={false} />
              <Text maxFontSizeMultiplier={2} style={styles.nextText}>Berikutnya</Text>
            </View>
          ) : null}
          <Text maxFontSizeMultiplier={2} style={styles.word}>{s.text}</Text>
          {status ? <StatusBadge status={status} label="Terbaik" /> : <Text maxFontSizeMultiplier={2} style={styles.muted}>Belum dicoba</Text>}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <Title>{path.word.text}</Title>
      <SourceChip source={path.word.source} />
      {!canAnalyze(path.whole) ? <InfoNote text="Penilaian belum tersedia di server demo." testID="word-not-supported" /> : null}

      {path.syllables.length > 0 ? (
        <View style={styles.gap}>
          <Text accessibilityRole="header" style={styles.section}>Level 2 · Suku kata</Text>
          {path.syllables.map(stepCard)}
        </View>
      ) : null}

      <View style={styles.gap}>
        <Text accessibilityRole="header" style={styles.section}>Level 3 · Kata</Text>
        {stepCard(path.whole, 0)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  section: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  word: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  muted: { fontSize: fontSize.small, color: colors.textMuted },
  next: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nextText: { fontSize: fontSize.small, fontWeight: '700', color: colors.text },
});
