import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BigButton, Body, Card, InfoNote, LipIllustration } from '../components';
import { ANALYZE_API, type AnalyzeApi } from '../config';
import type { PracticeItem } from '../data/types';
import { targetShape } from '../results/lipShapes';
import { useSettings } from '../state/settings';
import { colors, fontSize, overlay, radius, spacing } from '../theme';

/**
 * "Lihat" (LAT-4, LAT-7): the model video with the instruction text always under it.
 * Video source: the team's /v1/model-video/{itemId} when analysing with v1. `item.video` (Supabase Storage,
 * signed URL) is not wired yet (FL-8), so without v1 the step shows text only.
 */
export function ModelVideo({ item, source = ANALYZE_API }: { item: PracticeItem; source?: AnalyzeApi }) {
  const { api } = useSettings();
  const fromV1 = source === 'v1';
  const [state, setState] = useState<'loading' | 'available' | 'missing' | 'error'>(fromV1 ? 'loading' : 'missing');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!fromV1) return;
    let cancelled = false;
    api
      .hasModelVideo(item.itemId)
      .then((yes) => !cancelled && setState(yes ? 'available' : 'missing'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [api, fromV1, item.itemId, attempt]);

  const instruction = <Instruction item={item} />;
  if (state === 'loading') return <><Loading />{instruction}</>;
  if (state === 'available') return (
    <>
      <Player url={`${api.baseUrl}/v1/model-video/${encodeURIComponent(item.itemId)}`} text={item.text} onError={() => setState('error')} />
      {instruction}
    </>
  );
  return (
    <>
      <InfoNote
        testID={state === 'error' ? 'model-video-error' : 'model-video-missing'}
        tone={state === 'error' ? 'warning' : 'info'}
        text={state === 'error'
          ? 'Video contoh belum bisa dimuat. Ikuti tulisan di bawah, atau coba muat lagi.'
          : 'Video contoh belum tersedia. Ikuti tulisan di bawah.'}
      />
      <TextFallback item={item} />
      {instruction}
      {fromV1 ? (
        <BigButton label="Coba muat video lagi" icon="refresh" variant="secondary" onPress={() => {
          setState('loading');
          setAttempt((n) => n + 1);
        }} />
      ) : null}
    </>
  );
}

function Instruction({ item }: { item: PracticeItem }) {
  if (!item.instruction) return null;
  return (
    <View style={styles.instruction} testID="model-instruction">
      <Body>{item.instruction}</Body>
      {item.instructionSource === 'ai' ? <Body muted>Instruksi dibuat dengan bantuan AI</Body> : null}
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.center} accessible accessibilityLabel="Memuat video contoh" accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.text} />
      <Body>Memuat video contoh…</Body>
    </View>
  );
}

function Player({ url, text, onError }: { url: string; text: string; onError: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true; // no sound cues (flow §11); the picture carries the model
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

function TextFallback({ item }: { item: PracticeItem }) {
  // A lip drawing only for a single Level 1 vowel; words and syllables show the text.
  const shape = item.level === 1 ? targetShape([item.text.toLowerCase()]) : null;
  return (
    <Card>
      <View style={styles.fallback} testID="model-fallback">
        {shape ? <LipIllustration shape={shape} size={86} /> : null}
        <Text style={styles.word} accessibilityLabel={`Ucapkan ${item.text}`}>
          {item.text}
        </Text>
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
  instruction: { gap: spacing.xs },
  word: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
});
