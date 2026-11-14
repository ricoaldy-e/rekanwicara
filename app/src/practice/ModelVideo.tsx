import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BigButton, Body, InfoNote, LipIllustration } from '../components';
import { ANALYZE_API, type AnalyzeApi } from '../config';
import type { PracticeItem } from '../data/types';
import { targetShape } from '../results/lipShapes';
import { useSettings } from '../state/settings';
import { colors, displayFont, fontSize, lineHeight, radius, session, spacing, stroke, textFont } from '../theme';

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
      <VideoCard>
        <Player url={`${api.baseUrl}/v1/model-video/${encodeURIComponent(item.itemId)}`} text={item.text} onError={() => setState('error')} />
      </VideoCard>
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
    <View style={styles.instruction}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.instructionTitle, textFont(true)]}>Cara mengucapkan</Text>
      <View testID="model-instruction">
        <Body>{item.instruction}</Body>
        {item.instructionSource === 'ai' ? <Body muted>Instruksi dibuat dengan bantuan AI</Body> : null}
      </View>
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
  const { height } = useWindowDimensions();
  const track = player.videoTrack?.size;
  // shortcut: the ratio is read once the video is ready; before that a portrait 3:4 frame, the shape of our recordings.
  const ratio = track && track.width > 0 && track.height > 0 ? track.width / track.height : session.videoRatio;
  useEffect(() => {
    if (status === 'error') onError();
  }, [status, onError]);
  return (
    <>
      {status !== 'readyToPlay' ? <Loading /> : null}
      <View style={[styles.media, styles.videoFrame, { aspectRatio: ratio, maxHeight: height * session.videoMaxHeight }]} accessible accessibilityLabel={`Video contoh mengucapkan ${text}`}>
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      </View>
      <BigButton
        label="Putar contoh"
        icon="play-outline"
        variant="secondary"
        onPress={() => {
          player.currentTime = 0;
          player.play();
        }}
      />
    </>
  );
}

function VideoCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function TextFallback({ item }: { item: PracticeItem }) {
  // A lip drawing only for a single Level 1 vowel; words and syllables show the text.
  const shape = item.level === 1 ? targetShape([item.text.toLowerCase()]) : null;
  return (
    <VideoCard>
      <View style={styles.media} testID="model-fallback" accessibilityLabel={`Ucapkan ${item.text}`}>
        {shape ? (
          <LipIllustration shape={shape} size={session.illustration} />
        ) : (
          <Text accessible={false} style={[styles.word, displayFont()]}>
            {item.text}
          </Text>
        )}
      </View>
    </VideoCard>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  // Figma 46:159: card with a 200 dp media area and the play button inside.
  card: {
    gap: spacing.sm + spacing.xs,
    padding: spacing.sm + spacing.xs,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  media: {
    height: session.media,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
  },
  video: { width: '100%', height: '100%' },
  videoFrame: { height: undefined, alignSelf: 'center', width: '100%' },
  instruction: { gap: spacing.sm },
  instructionTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  word: { fontSize: fontSize.display, color: colors.text },
});
