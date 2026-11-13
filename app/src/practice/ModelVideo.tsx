import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Item } from '../api/types';
import { BigButton, Body, Card, InfoNote, LipIllustration } from '../components';
import { unitShapes } from '../results/lipShapes';
import { useSettings } from '../state/settings';
import { colors, fontSize, overlay, radius, spacing } from '../theme';

/** "Lihat": play the model video, with text and lip drawings when it is missing or fails. */
export function ModelVideo({ item }: { item: Item }) {
  const { api } = useSettings();
  const [state, setState] = useState<'loading' | 'available' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .hasModelVideo(item.item_id)
      .then((yes) => !cancelled && setState(yes ? 'available' : 'missing'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [api, item.item_id, attempt]);

  if (state === 'loading') return <Loading />;
  if (state === 'available') return (
    <Player url={`${api.baseUrl}/v1/model-video/${encodeURIComponent(item.item_id)}`} text={item.text} onError={() => setState('error')} />
  );
  return (
    <>
      <InfoNote
        testID={state === 'error' ? 'model-video-error' : 'model-video-missing'}
        tone={state === 'error' ? 'warning' : 'info'}
        text={state === 'error'
          ? 'Video contoh belum bisa dimuat. Ikuti tulisan dan gambar bibir, atau coba muat lagi.'
          : 'Video contoh belum tersedia. Ikuti tulisan dan gambar bibir.'}
      />
      <TextFallback item={item} />
      <BigButton label="Coba muat video lagi" icon="refresh" variant="secondary" onPress={() => {
        setState('loading');
        setAttempt((n) => n + 1);
      }} />
    </>
  );
}

function Loading() {
  return (
    <View style={styles.center} accessible accessibilityLabel="Memuat video contoh" accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Body>Memuat video contoh…</Body>
    </View>
  );
}

function Player({ url, text, onError }: { url: string; text: string; onError: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    if (status === 'error') onError();
  }, [status, onError]);
  return (
    <>
      {status !== 'readyToPlay' ? <Loading /> : null}
      <View style={styles.frame} accessible accessibilityLabel={`Video contoh mengucapkan ${text}`}>
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      </View>
    </>
  );
}

function TextFallback({ item }: { item: Item }) {
  return (
    <Card>
      <View style={styles.fallback} testID="model-fallback">
        {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
        <Text style={styles.word} accessibilityLabel={`Ucapkan ${item.text}`}>
          {item.text}
        </Text>
        <View style={styles.units}>
          {item.units.map((unit, index) => (
            <View key={`${unit}-${index}`} style={styles.unit}>
              <View style={styles.shapes}>
                {unitShapes(unit).map((shape, k) => (
                  <LipIllustration key={`${shape}-${k}`} shape={shape} size={86} />
                ))}
              </View>
              <Text style={styles.unitText}>{unit === 'm_hum' ? 'mmm' : unit}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: overlay.background,
    borderWidth: 3,
    borderColor: colors.border,
  },
  video: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: fontSize.display },
  word: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  units: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  unit: { alignItems: 'center', gap: spacing.xs },
  shapes: { flexDirection: 'row', gap: spacing.xs },
  unitText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
});
