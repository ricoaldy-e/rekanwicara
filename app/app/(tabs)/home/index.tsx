import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen } from '../../../src/components';
import { DATASET_MODE } from '../../../src/config';
import { summary } from '../../../src/data/progress';
import { useCatalog } from '../../../src/data/useCatalog';
import { useContent } from '../../../src/state/content';
import { useSettings } from '../../../src/state/settings';
import { useUser } from '../../../src/state/user';
import { colors, fontSize, spacing } from '../../../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function LevelCard(props: { level: string; name: string; icon: IconName; done: number; total: number; testID: string; onPress: () => void }) {
  const progress = `${props.done} dari ${props.total} sesuai`;
  return (
    <Card testID={props.testID} onPress={props.onPress} accessibilityLabel={`${props.level}, ${props.name}, ${progress}`}>
      <View style={styles.cardRow}>
        <Ionicons name={props.icon} size={28} color={colors.text} accessible={false} />
        <View style={styles.cardText}>
          <Text maxFontSizeMultiplier={2} style={styles.cardLevel}>{props.level}</Text>
          <Text maxFontSizeMultiplier={2} style={styles.cardName}>{props.name}</Text>
          <Text maxFontSizeMultiplier={2} style={styles.cardProgress}>{progress}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const { health, healthError } = useContent();
  const { apiUrl } = useSettings();
  const { profile, demo } = useUser();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });

  const l1 = data ? summary(profile.attempts, data.level1.map((i) => i.itemId)) : null;
  // shortcut: counts whole words (Level 3) only; Level 2 syllables need every word's detail, add with FL-5.
  const words = data ? summary(profile.attempts, data.words.map((w) => w.id)) : null;

  return (
    <Screen>
      {demo ? <InfoNote text="Mode demo: progres contoh. Hasil latihan di mode ini tidak disimpan online." /> : null}

      {!profile.calibrated ? (
        <View style={styles.gap}>
          <InfoNote text="Kalibrasi belum dilakukan. Dengan kalibrasi, hasil latihan lebih tepat untukmu." testID="calibration-banner" />
          <BigButton label="Kalibrasi sekarang" icon="options" variant="secondary" onPress={() => router.push('/calibration')} />
        </View>
      ) : null}

      {health?.mock_mode ? <InfoNote text="Server dalam mode contoh (mock). Hasil bukan analisis sebenarnya." /> : null}
      {healthError ? <InfoNote tone="warning" text={errorMessage(healthError)} /> : null}

      {loading && !data ? (
        <View style={styles.center} accessible accessibilityLabel="Memuat materi">
          <ActivityIndicator size="large" color={colors.text} />
          <Body>Memuat materi…</Body>
        </View>
      ) : null}

      {error ? (
        <View style={styles.gap}>
          <InfoNote tone="warning" text={errorMessage(error)} testID="home-error" />
          <BigButton label="Coba lagi" icon="refresh" onPress={reload} disabled={loading} />
        </View>
      ) : null}

      {l1 && words ? (
        <View style={styles.gap}>
          <LevelCard
            testID="card-level-1"
            level="Level 1"
            name="Bunyi vokal"
            icon="volume-medium-outline"
            done={l1.done}
            total={l1.total}
            onPress={() => router.push('/home/level-1')}
          />
          <LevelCard
            testID="card-words"
            level="Level 2 dan 3"
            name="Pilih kata"
            icon="chatbubble-outline"
            done={words.done}
            total={words.total}
            onPress={() => router.push('/home/words')}
          />
        </View>
      ) : null}

      <Card onPress={() => router.push('/about')} accessibilityLabel="Tentang aplikasi">
        <Text maxFontSizeMultiplier={2} style={styles.link}>Tentang aplikasi</Text>
      </Card>

      {DATASET_MODE ? (
        <BigButton label="Mode Dataset" icon="videocam" variant="secondary" onPress={() => router.push('/dataset')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.xs },
  cardLevel: { fontSize: fontSize.small, color: colors.textMuted },
  cardName: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  cardProgress: { fontSize: fontSize.body, color: colors.text },
  link: { fontSize: fontSize.label, fontWeight: '700', color: colors.text },
});
