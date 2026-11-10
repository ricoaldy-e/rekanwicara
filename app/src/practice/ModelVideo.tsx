import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Item } from '../api/types';
import { Card, LipIllustration } from '../components';
import { unitShapes } from '../results/lipShapes';
import { useSettings } from '../state/settings';
import { colors, fontSize, radius, spacing } from '../theme';

/**
 * "Lihat" step: the model video from the server, or big text + emoji + lip drawings when there is none (404).
 * The practice screen mounts one per item, so `available` never has to be reset.
 */
export function ModelVideo({ item }: { item: Item }) {
  const { api } = useSettings();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .hasModelVideo(item.item_id)
      .then((yes) => !cancelled && setAvailable(yes))
      .catch(() => !cancelled && setAvailable(false)); // unreachable server: the text fallback still teaches
    return () => {
      cancelled = true;
    };
  }, [api, item.item_id]);

  if (available === null) {
    return (
      <View style={styles.center} accessible accessibilityLabel="Memuat contoh">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return available ? (
    <Player url={`${api.baseUrl}/v1/model-video/${encodeURIComponent(item.item_id)}`} text={item.text} />
  ) : (
    <TextFallback item={item} />
  );
}

function Player({ url, text }: { url: string; text: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.frame} accessible accessibilityLabel={`Video contoh mengucapkan ${text}`}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
    </View>
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
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: colors.border,
  },
  video: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: fontSize.display },
  word: { fontSize: fontSize.display, fontWeight: '800', color: colors.text },
  units: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  unit: { alignItems: 'center', gap: spacing.xs },
  shapes: { flexDirection: 'row', gap: spacing.xs },
  unitText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
});
