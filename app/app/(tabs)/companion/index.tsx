import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BigButton, Body, InfoNote, LetterTile, ListGroup, ListRow, Screen, Snackbar } from '../../../src/components';
import { getWordStore } from '../../../src/data/media';
import { useCatalog } from '../../../src/data/useCatalog';
import { listMine, type MyWord } from '../../../src/data/words';
import { useFlash } from '../../../src/forms/flash';
import { MESSAGES } from '../../../src/forms/messages';
import { usePinSession } from '../../../src/pin/PinSession';
import { useSettings } from '../../../src/state/settings';
import { colors, companion, displayFont, fontSize, layout, lineHeight, spacing, textFont, wordList } from '../../../src/theme';

/**
 * Mode Pendamping (PEN-1, Figma 50:402): the companion's own words and the read-only built-in words.
 * Tapping a word opens Ubah kata, where it can also be deleted (design.md §6.6); the list has no delete button.
 */
export default function Companion() {
  const router = useRouter();
  const { lock } = usePinSession(); // the PIN gate lives in this tab's layout
  const { apiUrl } = useSettings();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [mine, setMine] = useState<MyWord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [flash, clearFlash] = useFlash();

  const load = useCallback(() => {
    if (!store) return;
    setLoadFailed(false);
    listMine(store).then(setMine, () => setLoadFailed(true));
  }, [store]);
  // Back from the form (saved or deleted): show the current list and catalog.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const builtIn = catalog.data?.words.filter((w) => w.source === 'default') ?? [];

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} footer={<Snackbar message={flash} onDismiss={clearFlash} />} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>Pendamping</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.intro, textFont()]}>Tambah kata untuk dilatih. Kata bawaan tidak bisa diubah.</Text>
        {store ? <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Ketuk kata untuk mengubah atau menghapus.</Text> : null}
      </View>

      {!store ? (
        <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
      ) : (
        <>
          <BigButton label="Tambah kata" icon="add" onPress={() => router.push('/companion/words/new')} testID="add-word" />
          {loadFailed ? (
            <>
              <InfoNote tone="warning" text="Daftar kata belum bisa dimuat." />
              <BigButton label="Coba lagi" icon="refresh" variant="secondary" onPress={load} />
            </>
          ) : !mine ? (
            <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat kata" />
          ) : mine.length === 0 ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, textFont(true)]}>Kata saya</Text>
              <Body muted>{MESSAGES.companionEmpty}</Body>
            </View>
          ) : (
            <ListGroup title="Kata saya">
              {mine.map((w) => {
                const meta = w.syllableCount > 0 ? `${w.syllableCount} suku kata` : 'Tanpa suku kata';
                return (
                  <ListRow
                    key={w.id}
                    testID={`mine-${w.id}`}
                    title={w.text.toLowerCase()}
                    subtitle={w.complete ? meta : `${meta} · ${MESSAGES.wordIncomplete}`}
                    leading={<LetterTile letter={w.text.charAt(0).toUpperCase()} />}
                    trailing={!w.complete ? <Ionicons name="warning-outline" size={wordList.chipIcon} color={colors.danger} accessible={false} /> : undefined}
                    accessibilityLabel={w.complete ? `Ubah ${w.text}` : `Ubah ${w.text}. ${w.text}: ${MESSAGES.wordIncomplete}`}
                    onPress={() => router.push({ pathname: '/companion/words/[wordId]/edit', params: { wordId: w.id } })}
                  />
                );
              })}
            </ListGroup>
          )}
        </>
      )}

      <ListGroup title="Kata bawaan" inset={0} paddingVertical={companion.groupPadding} paddingRight={layout.sectionGap + spacing.xs}>
        {builtIn.map((w) => (
          <ListRow
            key={w.id}
            testID={`builtin-${w.id}`}
            title={w.text.toLowerCase()}
            paddingVertical={companion.rowPadding}
            accessibilityLabel={`${w.text}, bawaan, tidak bisa diubah`}
            trailing={
              <View style={styles.builtIn}>
                <Ionicons name="lock-closed-outline" size={wordList.chipIcon} color={colors.textMuted} accessible={false} />
                <Text accessible={false} style={[styles.builtInText, textFont(true)]}>Bawaan</Text>
              </View>
            }
          />
        ))}
      </ListGroup>

      <BigButton label="Kunci kembali" icon="lock-closed" variant="secondary" onPress={lock} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.md, gap: layout.groupGap },
  header: { gap: spacing.xs + spacing.xs / 2 },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  intro: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  builtIn: { flexDirection: 'row', alignItems: 'center', gap: wordList.chipGap },
  builtInText: { fontSize: fontSize.small, lineHeight: 20, color: colors.textMuted },
});
