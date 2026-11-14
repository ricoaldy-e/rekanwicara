import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../src/api/errors';
import { useAuth } from '../../../src/auth/AuthProvider';
import {
  BigButton,
  Body,
  Card,
  HeroCard,
  InfoNote,
  LetterTile,
  LevelTile,
  LipIllustration,
  ListGroup,
  ListRow,
  ProgressRing,
  Screen,
  StatTile,
  StatusBadge,
} from '../../../src/components';
import { DATASET_MODE } from '../../../src/config';
import { describeItem, nextItem, recentActivity, summary } from '../../../src/data/progress';
import { useCatalog } from '../../../src/data/useCatalog';
import { targetShape } from '../../../src/results/lipShapes';
import { useContent } from '../../../src/state/content';
import { fraction } from '../../../src/state/homeStats';
import { useSettings } from '../../../src/state/settings';
import { useUser } from '../../../src/state/user';
import { colors, displayFont, fontSize, homeList, layout, lineHeight, radius, spacing, stroke, statusStyles, textFont } from '../../../src/theme';

const FALLBACK_NAME = 'Teman';

/** An item the hero can continue with: a Level 1 material or a whole word (Level 3). */
interface HeroItem {
  itemId: string;
  level: number;
  text: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, textFont(true)]}>{title}</Text>
      {children}
    </View>
  );
}

type StepState = 'done' | 'next' | 'later';

function StepMarker({ state, n }: { state: StepState; n: number }) {
  if (state === 'done') {
    return (
      <View style={[styles.marker, styles.markerDone]}>
        <Ionicons name="checkmark" size={homeList.checkIcon} color={colors.onPrimary} accessible={false} />
      </View>
    );
  }
  return (
    <View style={[styles.marker, state === 'next' ? styles.markerNext : styles.markerLater]}>
      <Text accessible={false} style={[styles.markerNumber, textFont(true), state === 'later' && { color: colors.textMuted }]}>{n}</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { health, healthError } = useContent();
  const { apiUrl } = useSettings();
  const { profile, demo } = useUser();
  const { session } = useAuth();
  const { data, loading, error, reload } = useCatalog({ baseUrl: apiUrl });

  const name = session?.displayName?.trim() || FALLBACK_NAME;
  const l1 = data ? summary(profile.attempts, data.level1.map((i) => i.itemId)) : null;
  // shortcut: counts whole words (Level 3) only; Level 2 syllables need every word's detail, add with FL-5.
  const words = data ? summary(profile.attempts, data.words.map((w) => w.id)) : null;

  const items: HeroItem[] = data ? [...data.level1, ...data.words.map((w) => ({ itemId: w.id, level: 3, text: w.text }))] : [];
  const textById = new Map(items.map((i) => [i.itemId, i.text]));
  const next = data ? nextItem(profile.attempts, items) : null;
  const firstItem = data?.level1[0] ?? null;
  const isNewUser = !!data && profile.attempts.length === 0;
  const activity = recentActivity(profile.attempts);

  const open = (item: HeroItem) =>
    item.level === 3
      ? router.push({ pathname: '/home/words/[wordId]', params: { wordId: item.itemId } })
      : router.push({ pathname: '/practice/[itemId]', params: { itemId: item.itemId } });

  const heroShape = (item: HeroItem) => (item.level === 1 ? targetShape([item.text.toLowerCase()]) : null);
  const heroIllustration = (item: HeroItem) => {
    const shape = heroShape(item);
    return shape ? <LipIllustration shape={shape} size={homeList.heroIllustration} tone="hero" /> : undefined;
  };

  const steps: { key: string; title: string; subtitle: string; state: StepState; onPress?: () => void }[] = [
    {
      key: 'calibration',
      title: 'Kalibrasi wajah dan suara',
      subtitle: profile.calibrated ? 'Selesai' : 'Berikutnya',
      state: profile.calibrated ? 'done' : 'next',
      onPress: profile.calibrated ? undefined : () => router.push('/calibration'),
    },
    {
      key: 'first-sound',
      title: `Latih bunyi “${(firstItem?.text ?? 'a').toLowerCase()}”`,
      subtitle: profile.calibrated ? 'Berikutnya' : 'Belum',
      state: profile.calibrated ? 'next' : 'later',
      onPress: firstItem ? () => open(firstItem) : undefined,
    },
    {
      key: 'first-word',
      title: 'Pilih kata pertama',
      subtitle: 'Level 2 dan 3',
      state: 'later',
      onPress: () => router.push('/home/words'),
    },
  ];
  const stepsDone = steps.filter((s) => s.state === 'done').length;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View accessible accessibilityLabel={`Halo, ${name}`} style={styles.greeting}>
          <View style={styles.avatar}>
            <Text accessible={false} style={[styles.avatarText, textFont(true)]}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.greetingText}>
            <Text accessible={false} style={[styles.hello, textFont()]}>Halo,</Text>
            <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={2} style={[styles.name, displayFont()]}>{name}</Text>
          </View>
        </View>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.wordmark, displayFont()]}>Rekan Wicara</Text>
      </View>

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

      {next ? (
        <HeroCard
          testID="home-hero"
          eyebrow="Lanjutkan latihan"
          title={describeItem(next.item.level, next.item.itemId, next.item.text).title}
          body={`Level ${next.item.level} · ${next.status ? statusStyles[next.status].label.toLowerCase() : 'belum dicoba'}`}
          illustration={heroIllustration(next.item)}
        >
          <BigButton testID="hero-action" label="Lanjutkan" icon="play-outline" onPress={() => open(next.item)} />
        </HeroCard>
      ) : null}

      {isNewUser && firstItem ? (
        <>
          <HeroCard
            testID="home-hero-new"
            eyebrow="Latihan pertamamu"
            title={describeItem(firstItem.level, firstItem.itemId, firstItem.text).title}
            body="Bunyi paling mudah untuk memulai."
            illustration={heroIllustration(firstItem)}
          >
            <BigButton testID="hero-action" label="Mulai latihan pertama" icon="play-outline" onPress={() => open(firstItem)} />
          </HeroCard>

          <ListGroup
            testID="home-steps"
            title="Langkah awal"
            titleTrailing={`${stepsDone} dari ${steps.length}`}
            inset={homeList.markerInset}
            paddingRight={homeList.groupSidePadding}
          >
            {steps.map((step, i) => (
              <ListRow
                key={step.key}
                testID={`step-${step.key}`}
                title={step.title}
                subtitle={step.subtitle}
                leading={<StepMarker state={step.state} n={i + 1} />}
                muted={step.state === 'later'}
                paddingVertical={homeList.stepRowPadding}
                onPress={step.onPress}
                accessibilityLabel={`Langkah ${i + 1}: ${step.title}. ${step.subtitle}`}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {l1 && words ? (
        <>
          <Section title="Pilih level">
            <View style={styles.tiles}>
              <LevelTile
                testID="card-level-1"
                level="Level 1"
                title="Bunyi vokal"
                icon="volume-medium-outline"
                accessibilityLabel={`Level 1, Bunyi vokal, ${l1.done} dari ${l1.total} sesuai`}
                onPress={() => router.push('/home/level-1')}
              />
              <LevelTile
                testID="card-words"
                level="Level 2 dan 3"
                title="Pilih kata"
                icon="chatbubble-outline"
                accessibilityLabel={`Level 2 dan 3, Pilih kata, ${words.done} dari ${words.total} sesuai`}
                onPress={() => router.push('/home/words')}
              />
            </View>
          </Section>

          <Section title="Kemajuanmu">
            {profile.attempts.length === 0 ? (
              <View testID="progress-empty" accessible style={styles.empty}>
                <ProgressRing value={0} dashed />
                <View style={styles.emptyText}>
                  <Text accessible={false} style={[styles.rowTitle, textFont(true)]}>Belum ada latihan</Text>
                  <Text accessible={false} style={[styles.rowBody, textFont()]}>Kemajuanmu tampil di sini setelah latihan pertama.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.tiles}>
                <StatTile
                  testID="stat-vowels"
                  icon="volume-medium-outline"
                  ring={fraction(l1.done, l1.total)}
                  value={`${l1.done} / ${l1.total}`}
                  caption="vokal sesuai"
                  accessibilityLabel={`${l1.done} dari ${l1.total} vokal sesuai`}
                />
                <StatTile
                  testID="stat-words"
                  icon="chatbubble-outline"
                  ring={fraction(words.done, words.total)}
                  value={`${words.done} / ${words.total}`}
                  caption="kata sesuai"
                  accessibilityLabel={`${words.done} dari ${words.total} kata sesuai`}
                />
              </View>
            )}
          </Section>
        </>
      ) : null}

      {activity.length > 0 ? (
        <ListGroup
          testID="home-activity"
          title="Aktivitas terakhir"
          inset={0}
          paddingVertical={homeList.activityGroupPadding}
          paddingRight={homeList.groupSidePadding}
        >
          {activity.map((a) => {
            const d = describeItem(a.level, a.itemId, textById.get(a.itemId));
            const subtitle = `Level ${a.level}`;
            return (
              <ListRow
                key={a.itemId}
                testID={`activity-${a.itemId}`}
                title={d.title}
                subtitle={subtitle}
                leading={<LetterTile letter={d.letter} tone="outline" />}
                trailing={<StatusBadge status={a.status} />}
                accessibilityLabel={`${d.title}. ${subtitle}. ${statusStyles[a.status].label}`}
              />
            );
          })}
        </ListGroup>
      ) : null}

      <Card onPress={() => router.push('/about')} accessibilityLabel="Tentang aplikasi">
        <Text maxFontSizeMultiplier={2} style={[styles.link, textFont(true)]}>Tentang aplikasi</Text>
      </Card>

      {DATASET_MODE ? (
        <BigButton label="Mode Dataset" icon="videocam" variant="secondary" onPress={() => router.push('/dataset')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: layout.sectionGap, gap: layout.groupGap },
  gap: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  greeting: { flex: 1, minWidth: 1, flexDirection: 'row', alignItems: 'center', gap: layout.sectionGap },
  avatar: { width: homeList.avatar, height: homeList.avatar, borderRadius: homeList.avatar / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hero },
  avatarText: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.onHero },
  greetingText: { flexShrink: 1 },
  hello: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  name: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  wordmark: { flexShrink: 0, fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.textMuted },
  section: { gap: layout.sectionGap },
  sectionTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  tiles: { flexDirection: 'row', gap: layout.sectionGap },
  letterTile: { width: homeList.letterTile, height: homeList.letterTile, borderRadius: radius.tile, borderWidth: stroke.hairline, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  marker: { width: homeList.marker, height: homeList.marker, borderRadius: homeList.marker / 2, alignItems: 'center', justifyContent: 'center' },
  markerDone: { backgroundColor: colors.success },
  markerNext: { borderWidth: stroke.thick, borderColor: colors.text },
  markerLater: { borderWidth: stroke.thick, borderColor: colors.hairline },
  markerNumber: { fontSize: fontSize.small, lineHeight: 20, color: colors.text },
  empty: { flexDirection: 'row', alignItems: 'center', gap: homeList.emptyGap, padding: spacing.md, borderRadius: radius.card, borderWidth: stroke.hairline, borderColor: colors.hairline, backgroundColor: colors.surface },
  emptyText: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  rowTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  rowBody: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  link: { fontSize: fontSize.label, color: colors.text },
});
