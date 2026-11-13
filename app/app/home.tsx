import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, StageBadge, StatusBadge } from '../src/components';
import { DATASET_MODE } from '../src/config';
import { groupByLevel, LEVEL_NAMES } from '../src/content/levels';
import { useContent } from '../src/state/content';
import { planSession, seededRng, selectCore, type Role } from '../src/state/progression';
import { useUser } from '../src/state/user';
import { colors, fontSize, spacing } from '../src/theme';

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

  return (
    <Screen>
      {/* Hidden Settings: long-press the title for 2 s (for demo setup). */}
      <Pressable
        onLongPress={() => router.push('/settings')}
        delayLongPress={2000}
        accessibilityRole="header"
        accessibilityLabel="Misi hari ini"
      >
        <Text style={styles.title}>Misi hari ini</Text>
      </Pressable>
      {demo ? <InfoNote text="Mode demo: progres contoh. Hasil latihan di mode ini tidak disimpan online." /> : null}

      {!profile.calibrated ? (
        <View style={styles.gap}>
          <InfoNote text="Kalibrasi belum dilakukan. Dengan kalibrasi, hasil latihan lebih tepat untukmu." testID="calibration-banner" />
          <BigButton label="Kalibrasi sekarang" icon="options" onPress={() => router.push('/calibration')} />
        </View>
      ) : null}

      {needsHelp ? (
        <InfoNote testID="mission-needs-help" text="Belum ada materi pengganti untuk latihan inti. Buka Mode Pendamping untuk memilih langkah berikutnya." />
      ) : null}

      {plan.length > 0 ? (
        <Card testID="mission">
          <Text style={styles.missionLabel}>Sesi hari ini · ±{profile.settings.sessionMinutes} menit</Text>
          {plan.map((step, k) => {
            const it = itemOf(step.itemId);
            if (!it) return null;
            return (
              <Pressable
                key={`${step.itemId}-${k}`}
                onPress={() => open(step.itemId)}
                accessibilityRole="button"
                accessibilityLabel={`${ROLE_LABEL[step.role]}: ${it.text}${step.done ? ', sudah dilatih hari ini' : ''}`}
                style={styles.step}
              >
                <Ionicons name={step.done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={colors.text} />
                <Text style={styles.stepText}>
                  {ROLE_LABEL[step.role]}: {it.emoji ? `${it.emoji} ` : ''}
                  {it.text}
                </Text>
              </Pressable>
            );
          })}
          {next ? (
            <BigButton label="Mulai" icon="play" onPress={() => open(next.itemId)} testID="mission-start" />
          ) : needsHelp ? null : (
            <Body>Sesi hari ini selesai. Terima kasih sudah berlatih!</Body>
          )}
        </Card>
      ) : needsHelp ? null : (
        <Body muted>Pilih satu materi untuk mulai berlatih.</Body>
      )}

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

      {items
        ? groupByLevel(items).map((group) => (
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
                      {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
                      <Text style={styles.itemText}>{item.text}</Text>
                    </View>
                    {p ? <StageBadge stage={p.stage} testID={`stage-${item.item_id}`} /> : null}
                    {locked ? (
                      <Body muted>Lulus satu materi Level {item.level - 1} dulu untuk membuka ini.</Body>
                    ) : p?.last ? (
                      <StatusBadge status={p.last} label="Terakhir" />
                    ) : (
                      <Body muted>Belum dicoba</Body>
                    )}
                  </Card>
                );
              })}
            </View>
          ))
        : null}

      <View style={styles.footer}>
        <BigButton
          label="Mode Pendamping"
          icon="people"
          variant="secondary"
          onPress={() => router.push('/companion')}
        />
        <BigButton label="Tentang aplikasi" icon="information-circle" variant="secondary" onPress={() => router.push('/about')} />
        {DATASET_MODE ? (
          <BigButton label="Mode Dataset" icon="videocam" variant="secondary" onPress={() => router.push('/dataset')} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  levelTitle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  gap: { gap: spacing.sm },
  missionLabel: { fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingVertical: spacing.xs },
  stepText: { flex: 1, fontSize: fontSize.body, color: colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: fontSize.title },
  itemText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  footer: { gap: spacing.sm, marginTop: spacing.lg },
});
