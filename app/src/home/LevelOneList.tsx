import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { V2Material } from '../api/types';
import { getCompanionSession } from '../auth/companion';
import { BigButton, Body, Card, InfoNote, StatusBadge } from '../components';
import type { Attempt } from '../user/pure';
import { useSettings } from '../state/settings';
import { colors, fontSize, spacing } from '../theme';

export function LevelOneList({ ownerId, attempts = [] }: { ownerId: string; attempts?: readonly Attempt[] }) {
  const { api } = useSettings();
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    ownerId: string; api: typeof api; revision: number; items: V2Material[] | null; error: string | null;
  } | null>(null);
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void (async () => {
      const session = await getCompanionSession();
      if (session?.user.id !== ownerId) throw new Error('Sesi berubah. Silakan login kembali.');
      const catalog = await api.getV2Catalog(session.access_token);
      const current = await getCompanionSession();
      if (current?.user.id !== ownerId) throw new Error('Sesi berubah. Silakan login kembali.');
      if (!Array.isArray(catalog.level_1) || !catalog.level_1.every((item) =>
        typeof item.id === 'string' && typeof item.text === 'string' && Array.isArray(item.videos))) {
        throw new Error('Daftar latihan belum dapat dibaca.');
      }
      if (!cancelled) setSnapshot({ ownerId, api, revision, items: catalog.level_1, error: null });
    })().catch((failure: unknown) => {
      if (!cancelled) setSnapshot({ ownerId, api, revision, items: null,
        error: failure instanceof Error && failure.message.includes('Sesi berubah')
          ? failure.message : 'Latihan Level 1 belum dapat dimuat. Periksa koneksi, lalu coba lagi.' });
    });
    return () => { cancelled = true; };
  }, [api, ownerId, revision]));
  const current = snapshot?.ownerId === ownerId && snapshot.api === api && snapshot.revision === revision ? snapshot : null;
  return <View style={styles.list}>
    <Text accessibilityRole="header" style={styles.title}>Level 1: Bunyi dasar</Text>
    <Body>Pilih bunyi untuk melihat contoh dan mulai berlatih.</Body>
    {!current ? <ActivityIndicator color={colors.primary} accessibilityLabel="Memuat Level 1" /> : null}
    {current?.error ? <>
      <InfoNote tone="warning" text={current.error} />
      <BigButton label="Muat ulang Level 1" icon="refresh" onPress={() => setRevision((value) => value + 1)} />
    </> : null}
    {current?.items?.length === 0 ? <InfoNote text="Materi Level 1 belum tersedia." /> : null}
    {current?.items?.map((item) => {
      const last = [...attempts].reverse().find((attempt) => attempt.itemId === item.id);
      return <Card key={item.id}
      accessibilityLabel={`Latihan ${item.text}`} accessibilityHint="Lihat contoh dan mulai latihan"
      testID={`level-one-${item.id}`}
      onPress={() => router.push({ pathname: '/practice/[itemId]', params: { itemId: item.id, v2: '1' } })}>
      <Text style={styles.target}>{item.text}</Text>
      <Body>{item.videos.some((video) => video.available) ? 'Video contoh tersedia' : 'Panduan teks tersedia; video contoh belum tersedia.'}</Body>
      {last ? <StatusBadge label="Terakhir" status={last.overall} /> : <Body muted>Belum dicoba</Body>}
    </Card>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  title: { fontSize: fontSize.large, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  target: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
});
