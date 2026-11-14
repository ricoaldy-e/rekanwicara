import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../../../src/api/apiError';
import { errorMessage } from '../../../../src/api/errors';
import { useFocusRing } from '../../../../src/a11y/useFocusRing';
import { BigButton, InfoNote, LoadingView, Screen, SourceChip, StatusBadge, UntriedBadge } from '../../../../src/components';
import { canAnalyze } from '../../../../src/data/analyze';
import { bestStatus } from '../../../../src/data/progress';
import type { PracticeItem } from '../../../../src/data/types';
import { useWordPath } from '../../../../src/data/useCatalog';
import { useSettings } from '../../../../src/state/settings';
import { useUser } from '../../../../src/state/user';
import type { Attempt } from '../../../../src/user/pure';
import { colors, displayFont, fontSize, layout, lineHeight, pathCard, radius, spacing, statusStyles, stroke, textFont, wordList } from '../../../../src/theme';

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
          <LoadingView label="Memuat kata" />
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

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={[styles.title, displayFont()]}>{path.word.text.toLowerCase()}</Text>
          <SourceChip source={path.word.source} tall />
        </View>
        <Text maxFontSizeMultiplier={2} style={[styles.intro, textFont()]}>Latih suku kata dulu, lalu kata utuh. Urutan hanya saran.</Text>
      </View>
      {!canAnalyze(path.whole) ? <InfoNote text="Penilaian belum tersedia di server demo." testID="word-not-supported" /> : null}

      {path.syllables.length > 0 ? (
        <>
          <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.section, textFont(true)]}>Level 2 · Suku kata</Text>
          {path.syllables.map((s, k) => (
            <StepCard key={`${s.key}-${k}`} step={s} title={`Suku kata ${s.position ?? k + 1}`} next={s.key === next} attempts={profile.attempts} onPress={() => open(s)} />
          ))}
        </>
      ) : null}

      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.section, textFont(true)]}>Level 3 · Kata</Text>
      <StepCard step={path.whole} title="Kata utuh" next={path.whole.key === next} attempts={profile.attempts} onPress={() => open(path.whole)} />
    </Screen>
  );
}

/** One practice step (Figma 31:344): tile with the text, title, best status and, on the suggested one, the "Berikutnya" chip. */
function StepCard({ step: s, title, next, attempts, onPress }: { step: PracticeItem; title: string; next: boolean; attempts: readonly Attempt[]; onPress: () => void }) {
  const { focusProps, focusStyle } = useFocusRing();
  const status = bestStatus(attempts, s.itemId);
  return (
    <Pressable
      testID={`step-${s.key}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${s.text}, Level ${s.level}, ${status ? `terbaik ${statusStyles[status].label}` : 'belum dicoba'}${next ? ', berikutnya' : ''}`}
      {...focusProps}
      style={({ pressed }) => [styles.card, next && styles.cardNext, pressed && styles.pressed, focusStyle]}
    >
      <View style={styles.tile}>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.tileText, displayFont()]}>{s.text.toLowerCase()}</Text>
      </View>
      <View style={styles.cardText}>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.cardTitle, textFont(true)]}>{title}</Text>
        {status ? <StatusBadge status={status} /> : <UntriedBadge />}
        {next ? (
          <View style={styles.nextChip} testID="next-marker">
            <Ionicons name="arrow-forward" size={wordList.chipIcon} color={colors.onHero} accessible={false} />
            <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.nextText, textFont(true)]}>Berikutnya</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={pathCard.chevron} color={colors.textMuted} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: layout.sectionGap },
  titleBlock: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: layout.sectionGap },
  title: { fontSize: fontSize.display, lineHeight: lineHeight.display, color: colors.text },
  intro: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  section: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pathCard.gap,
    padding: pathCard.padding,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  cardNext: { padding: pathCard.paddingNext, borderColor: colors.hero },
  pressed: { backgroundColor: colors.surfaceRaised },
  tile: {
    height: pathCard.tileHeight,
    minWidth: pathCard.tileMinWidth,
    paddingHorizontal: pathCard.tilePaddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
  },
  tileText: { fontSize: fontSize.title, lineHeight: lineHeight.title, color: colors.text },
  cardText: { flex: 1, minWidth: 1, gap: pathCard.textGap, alignItems: 'flex-start' },
  cardTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wordList.chipGap,
    paddingHorizontal: wordList.chipPaddingHorizontal,
    paddingVertical: wordList.chipPaddingVerticalLarge,
    borderRadius: radius.tile,
    backgroundColor: colors.hero,
  },
  nextText: { fontSize: fontSize.small, lineHeight: 20, color: colors.onHero },
});
