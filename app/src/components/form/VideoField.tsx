import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { pickFromGallery, recordWithCamera, type PickResult } from '../../data/pickVideo';
import type { VideoInput } from '../../data/words';
import { MESSAGES, messageOf, UI } from '../../forms/messages';
import { videoFile } from '../../forms/validators/video';
import { describeVideo } from '../../forms/videoMeta';
import { colors, fontSize, iconSize, lineHeight, radius, spacing, stroke, textFont, wordForm } from '../../theme';
import { BigButton } from '../BigButton';
import { FieldError } from './FieldError';
import { InfoNote } from '../InfoNote';

export interface VideoFieldProps {
  label: string;
  value: VideoInput | null;
  onChange: (value: VideoInput | null) => void;
  /** Already-formatted error from the form (e.g. "Pilih atau rekam video contoh."). */
  error?: string | null;
  /** A syllable's video: a one-line summary instead of the card and the preview (Figma 50:574). */
  compact?: boolean;
  testID?: string;
}

/**
 * One video: pick from the gallery or record, preview without sound, replace or delete. A picked file is checked
 * (format, size, length) before it is accepted; a wrong one is refused with the reason and the old value stays.
 */
export function VideoField({ label, value, onChange, error, compact = false, testID }: VideoFieldProps) {
  const [pickError, setPickError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const take = async (pick: () => Promise<PickResult>) => {
    setBusy(true);
    setPickError(null);
    setDenied(false);
    try {
      const res = await pick();
      if (res.kind === 'denied') setDenied(true);
      else if (res.kind === 'error') setPickError(MESSAGES.videoPickFailed);
      else if (res.kind === 'picked') {
        const problem = videoFile(res.file);
        if (problem) setPickError(messageOf(problem));
        else onChange({ kind: 'new', file: res.file });
      }
    } finally {
      setBusy(false);
    }
  };

  const shownError = pickError ?? error ?? null;
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={[styles.label, textFont(true)]}>{label}</Text>
      {value ? <FileCard value={value} compact={compact} /> : null}
      {value?.kind === 'new' && !compact ? <Preview uri={value.file.uri} label={label} /> : null}
      <View style={styles.row}>
        <View style={styles.cell}>
          <BigButton
            compact
            label={value ? UI.replaceGallery : UI.pickGallery}
            icon="images-outline"
            variant="secondary"
            disabled={busy}
            accessibilityLabel={`${value ? UI.replaceGallery : UI.pickGallery}, ${label}`}
            onPress={() => take(pickFromGallery)}
            testID={testID ? `${testID}-gallery` : undefined}
          />
        </View>
        <View style={styles.cell}>
          {value ? (
            <BigButton
              compact
              label={UI.removeVideo}
              icon="trash-outline"
              variant="secondary"
              accessibilityLabel={`${UI.removeVideo}, ${label}`}
              onPress={() => onChange(null)}
              testID={testID ? `${testID}-remove` : undefined}
            />
          ) : (
            <BigButton
              compact
              label={UI.recordVideo}
              icon="videocam-outline"
              variant="secondary"
              disabled={busy}
              accessibilityLabel={`${UI.recordVideo}, ${label}`}
              onPress={() => take(recordWithCamera)}
              testID={testID ? `${testID}-camera` : undefined}
            />
          )}
        </View>
      </View>
      {value ? (
        <BigButton
          label={UI.recordAgain}
          icon="videocam-outline"
          variant="secondary"
          disabled={busy}
          accessibilityLabel={`${UI.recordAgain}, ${label}`}
          onPress={() => take(recordWithCamera)}
          testID={testID ? `${testID}-camera` : undefined}
        />
      ) : null}
      {denied ? (
        <>
          <InfoNote tone="warning" text={MESSAGES.videoPermissionCamera} testID={testID ? `${testID}-denied` : undefined} />
          <BigButton label={UI.openSettings} icon="settings-outline" variant="secondary" onPress={() => void Linking.openSettings()} />
        </>
      ) : null}
      {shownError ? <FieldError text={shownError} testID={testID ? `${testID}-error` : undefined} /> : null}
    </View>
  );
}

/** The chosen video: thumbnail, name and facts (Figma 50:534), or one line for a syllable (Figma 50:574). */
function FileCard({ value, compact }: { value: VideoInput; compact: boolean }) {
  const { name, length, size } = describeVideo(value);
  if (compact) {
    return (
      <View style={styles.compact} testID="video-summary">
        <Ionicons name="videocam-outline" size={iconSize.base} color={colors.text} accessible={false} />
        <Text numberOfLines={1} maxFontSizeMultiplier={2} style={[styles.compactText, textFont()]}>{length ? `${name} · ${length}` : MESSAGES.videoKept}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card} testID="video-card">
      <View style={styles.thumb}>
        <Ionicons name="videocam-outline" size={wordForm.thumbIcon} color={colors.text} accessible={false} />
      </View>
      <View style={styles.cardText}>
        <Text numberOfLines={1} maxFontSizeMultiplier={2} style={[styles.name, textFont(true)]}>{name}</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.facts, textFont()]}>{length && size ? `${length} · ${size}` : MESSAGES.videoKept}</Text>
      </View>
    </View>
  );
}

/** Playback is muted and never starts by itself; the controls start it. */
function Preview({ uri, label }: { uri: string; label: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
  });
  return (
    <View style={styles.frame} accessible accessibilityLabel={`Pratinjau video, ${label}`}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.small, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, minWidth: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs, padding: spacing.sm + spacing.xs, borderRadius: radius.tile, borderWidth: stroke.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  thumb: { width: wordForm.thumb, height: wordForm.thumb, borderRadius: wordForm.thumbRadius, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  cardText: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  name: { fontSize: fontSize.body, lineHeight: lineHeight.label, color: colors.text },
  facts: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs, padding: spacing.sm + spacing.xs, borderRadius: radius.tile, backgroundColor: colors.surfaceRaised },
  compactText: { flex: 1, minWidth: 1, fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  frame: { width: '100%', aspectRatio: 3 / 4, maxHeight: 280, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.surface },
  video: { width: '100%', height: '100%' },
});
