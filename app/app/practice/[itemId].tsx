import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, InfoNote, Screen, StatusBadge, StepHeader } from '../../src/components';
import { useContent } from '../../src/state/content';
import { colors, fontSize, spacing } from '../../src/theme';

/** SPEC §2 cycle. Placeholder (B0); model video, recording and results come in B1/B2. */
const CYCLE = ['Lihat', 'Tiru', 'Bandingkan', 'Ulangi'] as const;

export default function Practice() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { items } = useContent();
  const item = items?.find((it) => it.item_id === itemId);

  if (!item) {
    return (
      <Screen>
        <InfoNote tone="warning" text="Materi tidak ditemukan. Kembali ke beranda dan pilih materi lain." />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader step={1} total={CYCLE.length} title={CYCLE[0]} />
      <Card>
        <View style={styles.target}>
          {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
          <Text style={styles.text} accessibilityLabel={`Ucapkan ${item.text}`}>
            {item.text}
          </Text>
        </View>
      </Card>
      <Body muted>Langkah latihan: {CYCLE.join(' → ')}</Body>
      <InfoNote text="Video contoh dan perekaman belum aktif di versi kerangka ini." />
      <Body muted>Contoh tampilan hasil:</Body>
      <View style={styles.badges}>
        <StatusBadge status="hijau" label="Bibir" />
        <StatusBadge status="kuning" label="Suara" />
      </View>
      <Body muted>Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  target: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emoji: { fontSize: fontSize.display },
  text: { fontSize: fontSize.display, fontWeight: '800', color: colors.text },
  badges: { gap: spacing.sm },
});
