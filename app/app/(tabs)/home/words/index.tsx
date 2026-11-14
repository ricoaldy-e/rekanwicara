import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../../../../src/a11y/useFocusRing';
import type { Source } from '../../../../src/api/types';
import { errorMessage } from '../../../../src/api/errors';
import { BigButton, Body, InfoNote, LetterTile, ListGroup, Screen, SegmentedControl, SourceChip, StatusBadge, UntriedBadge } from '../../../../src/components';
import { bestStatus, summary } from '../../../../src/data/progress';
import type { WordSummary } from '../../../../src/data/types';
import { useCatalog, useWordPath } from '../../../../src/data/useCatalog';
import { useSettings } from '../../../../src/state/settings';
import { useUser } from '../../../../src/state/user';
import type { Attempt } from '../../../../src/user/pure';
import { colors, displayFont, fontSize, layout, lineHeight, spacing, textFont, wordList, listGroup } from '../../../../src/theme';

type Filter = 'all' | Source;
const FILTERS = [
  { value: 'all', label: 'Semua kata' },
  { value: 'default', label: 'Bawaan' },
  { value: 'custom', label: 'Pendamping' },
] as const;

export default function Words() {
  const router = useRouter();
  const { apiUrl } = useSettings();
  const { profile } = useUser();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });
  const [filter, setFilter] = useState<Filter>('all');
  const shown = data?.words.filter((w) => filter === 'all' || w.source === filter) ?? [];

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>Pilih kata</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.intro, textFont()]}>Pilih satu kata. Latih suku katanya dulu, lalu kata utuh.</Text>
      </View>

      <SegmentedControl testID="words-filter" accessibilityLabel="Filter kata" options={FILTERS} value={filter} onChange={setFilter} />

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
      {data && data.words.length > 0 && shown.length === 0 ? (
        <InfoNote text={filter === 'custom' ? 'Belum ada kata dari Pendamping.' : 'Tidak ada kata di filter ini.'} testID="words-filter-empty" />
      ) : null}

      {shown.length > 0 ? (
        <ListGroup title="Daftar Kata Latihan">
          {shown.map((w) => (
            <WordRow key={w.id} word={w} apiUrl={apiUrl} attempts={profile.attempts} onPress={() => router.push({ pathname: '/home/words/[wordId]', params: { wordId: w.id } })} />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

/** One word: letter tile, word + best status, syllables and source (Figma 37:408). The Level 2 count (read aloud only) needs the word's syllables, loaded for this row. */
function WordRow({ word: w, apiUrl, attempts, onPress }: { word: WordSummary; apiUrl: string; attempts: readonly Attempt[]; onPress: () => void }) {
  const { focusProps, focusStyle } = useFocusRing();
  const path = useWordPath(w.id, { baseUrl: apiUrl });
  const best = bestStatus(attempts, w.id);
  const l3 = best === 'sesuai' ? 'sesuai' : 'belum';
  // While the syllables load, or when they cannot be loaded, only Level 3 is told (never a wrong Level 2 number).
  const l2 = w.hasLevel2 && path.data ? summary(attempts, path.data.syllables.map((s) => s.itemId)) : null;
  const text = `${l2 ? `Level 2: ${l2.done} dari ${l2.total} sesuai · ` : ''}Level 3: ${l3}`;
  const syllables = path.data && path.data.syllables.length > 0 ? path.data.syllables.map((s) => s.text.toLowerCase()).join(' · ') : null;
  const word = w.text.toLowerCase();
  return (
    <Pressable
      testID={`word-${w.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${w.text}, ${w.source === 'default' ? 'bawaan' : 'dari Pendamping'}, ${text}`}
      {...focusProps}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, focusStyle]}
    >
      <LetterTile letter={w.text.charAt(0).toUpperCase()} large />
      <View style={styles.rowText}>
        <View style={styles.titleRow}>
          <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.word, textFont(true)]}>{word}</Text>
          {best ? <StatusBadge status={best} /> : <UntriedBadge />}
        </View>
        {syllables ? <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Suku kata: {syllables}</Text> : null}
        <SourceChip source={w.source} />
      </View>
      <Ionicons name="chevron-forward" size={wordList.chevron} color={colors.textMuted} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: layout.sectionGap },
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  titleBlock: { gap: spacing.sm },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  intro: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: listGroup.rowGap, paddingVertical: listGroup.rowPaddingVertical },
  pressed: { backgroundColor: colors.surfaceRaised },
  rowText: { flex: 1, minWidth: 1, gap: wordList.textGap },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: wordList.titleRowGap },
  word: { flex: 1, minWidth: 1, fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
