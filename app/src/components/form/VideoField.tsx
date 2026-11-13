import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { pickFromGallery, recordWithCamera, type PickResult } from '../../data/pickVideo';
import type { VideoInput } from '../../data/words';
import { MESSAGES, messageOf, UI } from '../../forms/messages';
import { videoFile } from '../../forms/validators/video';
import { colors, fontSize, radius, spacing } from '../../theme';
import { BigButton } from '../BigButton';
import { FieldError } from './FieldError';
import { InfoNote } from '../InfoNote';

export interface VideoFieldProps {
  label: string;
  value: VideoInput | null;
  onChange: (value: VideoInput | null) => void;
  /** Already-formatted error from the form (e.g. "Pilih atau rekam video contoh."). */
  error?: string | null;
  testID?: string;
}

/**
 * One video: pick from the gallery or record, preview without sound, replace or delete. A picked file is checked
 * (format, size, length) before it is accepted; a wrong one is refused with the reason and the old value stays.
 */
export function VideoField({ label, value, onChange, error, testID }: VideoFieldProps) {
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
      <Text style={styles.label}>{label}</Text>
      {value?.kind === 'new' ? <Preview uri={value.file.uri} label={label} /> : null}
      {value?.kind === 'kept' ? <Text style={styles.kept}>{MESSAGES.videoKept}</Text> : null}
      <BigButton
        label={value ? UI.replaceGallery : UI.pickGallery}
        icon="images-outline"
        variant="secondary"
        disabled={busy}
        accessibilityLabel={`${value ? UI.replaceGallery : UI.pickGallery}, ${label}`}
        onPress={() => take(pickFromGallery)}
        testID={testID ? `${testID}-gallery` : undefined}
      />
      <BigButton
        label={value ? UI.recordAgain : UI.recordVideo}
        icon="videocam-outline"
        variant="secondary"
        disabled={busy}
        accessibilityLabel={`${value ? UI.recordAgain : UI.recordVideo}, ${label}`}
        onPress={() => take(recordWithCamera)}
        testID={testID ? `${testID}-camera` : undefined}
      />
      {value ? (
        <BigButton
          label={UI.removeVideo}
          icon="trash-outline"
          variant="secondary"
          accessibilityLabel={`${UI.removeVideo}, ${label}`}
          onPress={() => onChange(null)}
          testID={testID ? `${testID}-remove` : undefined}
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
  label: { fontSize: fontSize.label, fontWeight: '700', color: colors.text },
  kept: { fontSize: fontSize.body, color: colors.textMuted },
  frame: { width: '100%', aspectRatio: 3 / 4, maxHeight: 280, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.surface },
  video: { width: '100%', height: '100%' },
});
