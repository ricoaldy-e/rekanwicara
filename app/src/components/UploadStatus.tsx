import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../api/errors';
import type { UploadState } from '../recording/useUpload';
import { colors, fontSize, spacing } from '../theme';
import { BigButton } from './BigButton';
import { InfoNote } from './InfoNote';
import { ProgressBar } from './ProgressBar';

export interface UploadStatusProps {
  state: UploadState;
  onRetry?: () => void;
  /** Overrides the default error text, e.g. for a known server code. */
  describeError?: (error: unknown) => string | null;
}

export function UploadStatus({ state, onRetry, describeError }: UploadStatusProps) {
  if (state.status === 'uploading') {
    const pct = state.fraction === null ? null : Math.round(state.fraction * 100);
    const label = pct === null ? 'Mengirim…' : `Mengirim… ${pct}%`;
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>{label}</Text>
        <ProgressBar value={state.fraction} accessibilityLabel={label} />
        {state.attempt > 1 ? <Text style={styles.muted}>Percobaan ke-{state.attempt}</Text> : null}
      </View>
    );
  }
  if (state.status === 'error') {
    const text = describeError?.(state.error) ?? errorMessage(state.error);
    return (
      <View style={styles.wrap}>
        <InfoNote tone="warning" text={text} testID="upload-error" />
        {onRetry ? <BigButton label="Coba kirim lagi" icon="refresh" onPress={onRetry} /> : null}
      </View>
    );
  }
  if (state.status === 'done') {
    return <Text style={[styles.text, styles.ok]}>✓ Terkirim</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  text: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: fontSize.small, color: colors.textMuted },
  ok: { color: '#1B5E20' },
});
