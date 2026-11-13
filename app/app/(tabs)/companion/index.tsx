import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BigButton, Body, Card, ConfirmDialog, InfoNote, Screen, Snackbar, SourceChip, Title } from '../../../src/components';
import { getWordStore } from '../../../src/data/media';
import { useCatalog } from '../../../src/data/useCatalog';
import { listMine, removeWord, type MyWord } from '../../../src/data/words';
import { showFlash, useFlash } from '../../../src/forms/flash';
import { fill, MESSAGES } from '../../../src/forms/messages';
import { usePinSession } from '../../../src/pin/PinSession';
import { useSettings } from '../../../src/state/settings';
import { colors, fontSize, spacing } from '../../../src/theme';

/** Mode Pendamping (PEN-1): the companion's own words (add, edit, delete) and the read-only built-in words. */
export default function Companion() {
  const router = useRouter();
  const { lock } = usePinSession(); // the PIN gate lives in this tab's layout
  const { apiUrl } = useSettings();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [mine, setMine] = useState<MyWord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [toDelete, setToDelete] = useState<MyWord | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [flash, clearFlash] = useFlash();

  const load = useCallback(() => {
    if (!store) return;
    setLoadFailed(false);
    listMine(store).then(setMine, () => setLoadFailed(true));
  }, [store]);
  useFocusEffect(load); // back from the form: show the saved word

  const confirmDelete = async () => {
    const word = toDelete;
    setToDelete(null);
    if (!word || !store) return;
    setDeleteFailed(false);
    try {
      await removeWord(store, word.id);
      showFlash(fill(MESSAGES.wordDeleted, { word: word.text.toLowerCase() }));
      load();
      catalog.reload();
    } catch {
      setDeleteFailed(true);
    }
  };

  const builtIn = catalog.data?.words.filter((w) => w.source === 'default') ?? [];

  return (
    <Screen footer={<Snackbar message={flash} onDismiss={clearFlash} />}>
      <Title>Kata saya</Title>
      {!store ? (
        <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
      ) : (
        <>
          <BigButton label="Tambah kata" icon="add" onPress={() => router.push('/companion/words/new')} testID="add-word" />
          {deleteFailed ? <InfoNote tone="warning" text={MESSAGES.deleteFailed} testID="delete-failed" /> : null}
          {loadFailed ? (
            <>
              <InfoNote tone="warning" text="Daftar kata belum bisa dimuat." />
              <BigButton label="Coba lagi" icon="refresh" variant="secondary" onPress={load} />
            </>
          ) : !mine ? (
            <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat kata" />
          ) : mine.length === 0 ? (
            <Body muted>{MESSAGES.companionEmpty}</Body>
          ) : (
            mine.map((w) => (
              <Card key={w.id} testID={`mine-${w.id}`}>
                <View style={styles.gap}>
                  <Text maxFontSizeMultiplier={2} style={styles.word}>{w.text}</Text>
                  <Text maxFontSizeMultiplier={2} style={styles.meta}>
                    {w.syllableCount > 0 ? `${w.syllableCount} suku kata` : 'Tanpa suku kata'}
                  </Text>
                  {!w.complete ? (
                    <View style={styles.incomplete} accessible accessibilityLabel={`${w.text}: ${MESSAGES.wordIncomplete}`}>
                      <Ionicons name="warning-outline" size={20} color={colors.danger} />
                      <Text style={styles.incompleteText}>{MESSAGES.wordIncomplete}</Text>
                    </View>
                  ) : null}
                  <View style={styles.actions}>
                    <BigButton
                      label="Ubah"
                      icon="create-outline"
                      variant="secondary"
                      accessibilityLabel={`Ubah ${w.text}`}
                      onPress={() => router.push({ pathname: '/companion/words/[wordId]/edit', params: { wordId: w.id } })}
                    />
                    <BigButton label="Hapus" icon="trash-outline" variant="secondary" accessibilityLabel={`Hapus ${w.text}`} onPress={() => setToDelete(w)} />
                  </View>
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <Title>Kata bawaan</Title>
      <Body muted>Kata dari tim. Tidak bisa diubah atau dihapus.</Body>
      {builtIn.map((w) => (
        <Card key={w.id} testID={`builtin-${w.id}`}>
          <View style={styles.gap}>
            <Text maxFontSizeMultiplier={2} style={styles.word}>{w.text}</Text>
            <SourceChip source="default" />
          </View>
        </Card>
      ))}

      <BigButton label="Kunci kembali" icon="lock-closed" variant="secondary" onPress={lock} />

      <ConfirmDialog
        visible={toDelete !== null}
        title={
          toDelete
            ? toDelete.syllableCount > 0
              ? fill(MESSAGES.deleteWord, { word: toDelete.text.toLowerCase(), n: toDelete.syllableCount })
              : fill(MESSAGES.deleteWordNoSyllables, { word: toDelete.text.toLowerCase() })
            : ''
        }
        confirmLabel="Hapus"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  word: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.small, color: colors.textMuted },
  incomplete: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  incompleteText: { fontSize: fontSize.small, fontWeight: '700', color: colors.danger },
  actions: { gap: spacing.sm },
});
