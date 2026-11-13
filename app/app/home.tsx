import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../src/api/errors';
import { BigButton, Body, BottomBar, Card, HeroCard, InfoNote, Screen, StageBadge, StatusBadge } from '../src/components';
import { LevelTile } from '../src/components/LevelTile';
import { StatTile } from '../src/components/StatTile';
import { DATASET_MODE } from '../src/config';
import { groupByLevel, LEVEL_NAMES } from '../src/content/levels';
import { useContent } from '../src/state/content';
import { defaultLevel, fraction, homeStats, levelLocked } from '../src/state/homeStats';
import { planSession, seededRng, selectCore, type Role } from '../src/state/progression';
import { useUser } from '../src/state/user';
import { colors, fontFamily, fontSize, radius, spacing, touchTarget } from '../src/theme';

const ROLE_LABEL: Record<Role, string> = {
  pemanasan: 'Pemanasan',
  ulasan: 'Ulasan',
  inti: 'Latihan inti',
  tantangan: 'Tantangan',
};

export default function Home() {
  const router = useRouter();
  const { health, healthError, items, loading, error, reload } = useContent();
  const { profile, progress, demo } = useUser();
  const open = (itemId: string) => router.push({ pathname: '/practice/[itemId]', params: { itemId } });

  // Today's session (SPEC §8.4): warm-up, reviews, core material, challenge. The day seeds the random
  // challenge, so the plan does not change every time the screen is drawn.
  const plan = useMemo(() => {
    if (!items) return [];
    const now = new Date();
    const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    return planSession(items, progress, profile.attempts, profile.settings.sessionMinutes, now, seededRng(day));
  }, [items, progress, profile.attempts, profile.settings.sessionMinutes]);
  const itemOf = (id: string) => items?.find((it) => it.item_id === id);
  const next = plan.find((s) => !s.done);
  const needsHelp = items?.some((i) => progress.get(i.item_id)?.stage === 'macet') && !selectCore(items, progress);

  const groups = useMemo(() => (items ? groupByLevel(items) : []), [items]);
  const [chosenLevel, setChosenLevel] = useState<number | null>(null); // display state only
  const nextItem = next ? itemOf(next.itemId) : undefined;
  const shownLevel = chosenLevel ?? defaultLevel(groups, nextItem?.level, progress);
  const stats = homeStats(plan, items, progress);
  const minutes = profile.settings.sessionMinutes;

  return (
    <Screen
      footer={
        <BottomBar
          items={[
            { key: 'practice', label: 'Latihan', icon: 'barbell-outline', active: true, onPress: () => {} },
            { key: 'companion', label: 'Pendamping', accessibilityLabel: 'Mode Pendamping', icon: 'people-outline', onPress: () => router.push('/companion') },
            { key: 'about', label: 'Tentang', accessibilityLabel: 'Tentang aplikasi', icon: 'information-circle-outline', onPress: () => router.push('/about') },
          ]}
        />
      }
    >
      {/* Hidden Settings: long-press the title for 2 s (for demo setup). */}
      <Pressable
        onLongPress={() => router.push('/settings')}
        delayLongPress={2000}
        accessibilityRole="header"
        accessibilityLabel="Misi hari ini"
      >
        <Text style={styles.kicker}>Misi hari ini</Text>
      </Pressable>
      {demo ? <InfoNote text="Mode demo: progres contoh. Hasil latihan di mode ini tidak disimpan online." /> : null}

      {!profile.calibrated ? (
        <View style={styles.gap}>
          <InfoNote text="Kalibrasi belum dilakukan. Dengan kalibrasi, hasil latihan lebih tepat untukmu." testID="calibration-banner" />
          <BigButton label="Kalibrasi sekarang" icon="options" variant="secondary" onPress={() => router.push('/calibration')} />
        </View>
      ) : null}

      {plan.length > 0 ? (
        <HeroCard
          title={nextItem ? `Siap latihan “${nextItem.text}”?` : 'Latihan hari ini'}
          body={next ? `Langkah ${stats.stepsDone + 1} dari ${stats.stepsTotal}.` : needsHelp ? undefined : 'Sesi hari ini selesai.'}
        >
          {next ? <BigButton label="Mulai latihan" icon="play" onPress={() => open(next.itemId)} testID="mission-start" /> : null}
        </HeroCard>
      ) : needsHelp ? null : (
        <HeroCard title="Pilih satu materi untuk mulai berlatih." />
      )}

      {needsHelp ? (
        <InfoNote testID="mission-needs-help" text="Belum ada materi pengganti untuk latihan inti. Buka Mode Pendamping untuk memilih langkah berikutnya." />
      ) : null}

      {groups.length > 0 ? (
        <View style={styles.gap}>
          <Text style={styles.sectionLabel}>Level</Text>
          <View style={styles.tiles}>
            {groups.map((g) => (
              <LevelTile
                key={g.level}
                level={g.level}
                name={LEVEL_NAMES[g.level] ?? ''}
                locked={levelLocked(g.items, progress)}
                selected={g.level === shownLevel}
                onPress={() => setChosenLevel(g.level)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {items && items.length > 0 ? (
        <View style={styles.gap}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Kemajuanmu
          </Text>
          <View style={styles.tiles}>
            <StatTile
              value={`${stats.stepsDone} / ${stats.stepsTotal}`}
              caption="langkah"
              ring={fraction(stats.stepsDone, stats.stepsTotal)}
              accessibilityLabel={`${stats.stepsDone} dari ${stats.stepsTotal} langkah hari ini selesai`}
            />
            <StatTile
              value={`${stats.greenCount}`}
              caption="sesuai"
              ring={fraction(stats.greenCount, stats.itemCount)}
              accessibilityLabel={`${stats.greenCount} dari ${stats.itemCount} materi terakhir sesuai`}
            />
            <StatTile value={`${minutes}`} caption="menit sesi" accessibilityLabel={`Sesi ${minutes} menit`} />
          </View>
        </View>
      ) : null}

      {plan.length > 0 ? (
        <Card testID="mission">
          <Text accessibilityRole="header" style={styles.missionLabel}>
            Langkah hari ini · ±{minutes} menit
          </Text>
          {plan.map((step, k) => {
            const it = itemOf(step.itemId);
            if (!it) return null;
            return (
              <Pressable
                key={`${step.itemId}-${k}`}
                onPress={() => open(step.itemId)}
                accessibilityRole="button"
                accessibilityLabel={`${ROLE_LABEL[step.role]}: ${it.text}${step.done ? ', sudah dilatih hari ini' : ''}`}
                style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
              >
                <Ionicons name={step.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={colors.text} />
                <Text style={styles.stepText}>
                  {ROLE_LABEL[step.role]}: {it.emoji ? `${it.emoji} ` : ''}
                  {it.text}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {health?.mock_mode ? <InfoNote text="Server dalam mode contoh (mock). Hasil bukan analisis sebenarnya." /> : null}
      {healthError && !error ? <InfoNote tone="warning" text={errorMessage(healthError)} /> : null}

      {loading && !items ? (
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
      {!loading && !error && items?.length === 0 ? (
        <View style={styles.gap}>
          <InfoNote text="Materi belum tersedia. Coba muat ulang atau periksa koneksi server di pengaturan." />
          <BigButton label="Muat ulang materi" icon="refresh" onPress={reload} />
        </View>
      ) : null}

      {groups
        .filter((group) => group.level === shownLevel)
        .map((group) => (
          <View key={group.level} style={styles.gap}>
            <Text accessibilityRole="header" style={styles.levelTitle}>
              Level {group.level}: {LEVEL_NAMES[group.level] ?? ''}
            </Text>
            {group.items.map((item) => {
              const p = progress.get(item.item_id);
              const locked = p?.locked ?? false;
              return (
                <Card
                  key={item.item_id}
                  onPress={locked ? undefined : () => open(item.item_id)}
                  accessibilityLabel={`Latihan ${item.text}`}
                  accessibilityHint={locked ? undefined : 'Buka latihan'}
                  testID={`item-${item.item_id}`}
                >
                  <View style={styles.itemRow}>
                    {item.emoji ? (
                      <Text accessible={false} style={styles.emoji}>
                        {item.emoji}
                      </Text>
                    ) : null}
                    <Text style={styles.itemText}>{item.text}</Text>
                  </View>
                  <View style={styles.badges}>
                    {p ? <StageBadge stage={p.stage} testID={`stage-${item.item_id}`} /> : null}
                    {locked ? null : p?.last ? <StatusBadge status={p.last} label="Terakhir" /> : <Body muted>Belum dicoba</Body>}
                  </View>
                  {locked ? <Body muted>Lulus satu materi Level {item.level - 1} dulu untuk membuka ini.</Body> : null}
                </Card>
              );
            })}
          </View>
        ))}

      {DATASET_MODE ? (
        <View style={styles.footer}>
          <BigButton label="Mode Dataset" icon="videocam" variant="secondary" onPress={() => router.push('/dataset')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: fontSize.small, color: colors.textMuted, paddingVertical: spacing.sm },
  sectionLabel: { fontSize: fontSize.small, color: colors.textMuted },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  levelTitle: { fontFamily: fontFamily.display, fontSize: fontSize.large, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + spacing.xs },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  gap: { gap: spacing.sm },
  missionLabel: { fontSize: fontSize.label, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget, paddingVertical: spacing.xs, borderRadius: radius.tile },
  stepPressed: { backgroundColor: colors.surfaceRaised },
  stepText: { flex: 1, fontSize: fontSize.body, color: colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  emoji: { fontSize: fontSize.title },
  itemText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  footer: { gap: spacing.md, marginTop: spacing.lg },
});
