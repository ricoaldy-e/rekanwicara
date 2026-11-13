import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { overlay, colors, radius, spacing } from '../theme';

export interface ClipPreviewProps {
  uri: string;
}

/** Plays the fresh recording once (from the local file), with a large "play again" button. */
export function ClipPreview({ uri }: ClipPreviewProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
      </View>
      <BigButton
        label="Putar lagi"
        icon="play"
        variant="secondary"
        onPress={() => {
          player.replay();
          player.play();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
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
});
