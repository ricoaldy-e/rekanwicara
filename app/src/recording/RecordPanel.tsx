import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { ProgressBar } from '../components/ProgressBar';
import { colors, fontSize, radius, spacing } from '../theme';
import { deleteLocalFile } from './localFile';
import { PermissionGate } from './PermissionGate';
import {
  DEFAULT_DURATION_MS,
  initialRecorderState,
  recorderReducer,
  safetyMaxDurationS,
} from './recorder';

export interface RecordPanelProps {
  /** Recording length; SPEC §8.2 default 2500 ms (Level 0: 4000 ms). */
  durationMs?: number;
  /** Called with the local file URI (cache dir) of the mp4 with audio. */
  onRecorded: (uri: string) => void;
  /** Hides the record button, e.g. while a previous clip is uploading. */
  disabled?: boolean;
  recordLabel?: string;
  /** Text under the camera; defaults to the face-position hint. */
  hint?: string;
  permissionPurpose?: string;
  manualStop?: boolean;
  videoQuality?: '480p' | '1080p';
}

const REC_RED = '#C62828';
const PROGRESS_INTERVAL_MS = 100;

// Haptics are a visual-only UI's "beep" (CLAUDE.md: no sound cues). Never let them throw.
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => undefined);
};
const buzzDone = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};

/** Front camera, video + audio, oval guide, 3-2-1 countdown with vibration, clear REC indicator. */
export function RecordPanel(props: RecordPanelProps) {
  return (
    <PermissionGate purpose={props.permissionPurpose}>
      <RecorderCamera {...props} />
    </PermissionGate>
  );
}

function RecorderCamera({
  durationMs = DEFAULT_DURATION_MS,
  onRecorded,
  disabled = false,
  recordLabel = 'Rekam',
  hint = 'Letakkan wajah di dalam oval, lalu tekan Rekam.',
  manualStop = false,
  videoQuality = '480p',
}: RecordPanelProps) {
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(recorderReducer, initialRecorderState);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => {
    mounted.current = true;
    const cam = camera.current;
    return () => {
      mounted.current = false;
      clearTimers();
      try {
        cam?.stopRecording();
      } catch {
        // not recording
      }
    };
  }, [clearTimers]);

  // Countdown: one vibration per number, one second each.
  useEffect(() => {
    if (state.phase !== 'countdown') return;
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    const t = setTimeout(() => dispatch({ type: 'tick' }), 1000);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [state.phase, state.count]);

  // Recording: start, stop after durationMs from JS (Android's maxDuration is whole seconds only).
  useEffect(() => {
    if (state.phase !== 'recording') return;
    const cam = camera.current;
    if (!cam) {
      dispatch({ type: 'failed', message: 'Kamera belum siap.' });
      return;
    }
    buzz(Haptics.ImpactFeedbackStyle.Heavy);
    const started = Date.now();
    const progress = setInterval(() => {
      dispatch({ type: 'progress', elapsedMs: Math.min(Date.now() - started, durationMs) });
    }, PROGRESS_INTERVAL_MS);
    const stop = setTimeout(() => {
      dispatch({ type: 'stop' });
      try {
        cam.stopRecording();
      } catch {
        // already stopped
      }
    }, durationMs);
    timers.current.push(stop);

    cam
      .recordAsync({ maxDuration: safetyMaxDurationS(durationMs) })
      .then((result) => {
        if (!mounted.current) {
          deleteLocalFile(result?.uri);
          return;
        }
        clearInterval(progress);
        if (result?.uri) {
          buzzDone();
          dispatch({ type: 'finished' });
          onRecordedRef.current(result.uri);
        } else {
          dispatch({ type: 'failed', message: 'Rekaman tidak tersimpan. Coba lagi.' });
        }
      })
      .catch(() => {
        // shortcut: native rejection may omit the URI; verify device cache cleanup before claiming deletion.
        if (!mounted.current) return;
        clearInterval(progress);
        dispatch({ type: 'failed', message: 'Perekaman gagal. Coba lagi.' });
      });

    return () => {
      clearInterval(progress);
      clearTimeout(stop);
    };
    // Only re-run when entering the recording phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const busy = state.phase === 'countdown' || state.phase === 'recording' || state.phase === 'finishing';
  const seconds = (durationMs / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 });

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          videoQuality={videoQuality}
          onCameraReady={() => setReady(true)}
          onMountError={() => setMountError('Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera.')}
        />
        {/* Oval face guide: white ring with a dark outline so it shows on any background. */}
        <View pointerEvents="none" style={styles.ovalOuter}>
          <View style={[styles.ovalInner, state.phase === 'recording' && styles.ovalRecording]} />
        </View>

        {state.phase === 'countdown' ? (
          <View pointerEvents="none" style={styles.countOverlay} accessible accessibilityLiveRegion="assertive" accessibilityLabel={`Mulai dalam ${state.count}`}>
            <Text style={styles.countText}>{state.count}</Text>
            <Text style={styles.countHint}>Bersiap…</Text>
          </View>
        ) : null}

        {state.phase === 'recording' || state.phase === 'finishing' ? (
          <View pointerEvents="none" style={styles.recBadge} accessible accessibilityLiveRegion="assertive" accessibilityLabel="Sedang merekam">
            <View style={styles.recDot} />
            <Text style={styles.recText}>MEREKAM</Text>
          </View>
        ) : null}
      </View>

      {state.phase === 'recording' || state.phase === 'finishing' ? (
        <ProgressBar value={state.elapsedMs / durationMs} color={REC_RED} height={18} accessibilityLabel="Waktu rekam" />
      ) : null}

      <Text style={styles.hint}>{mountError ?? state.error ?? hint}</Text>

      {manualStop && state.phase === 'recording' ? (
        <BigButton
          label="Selesai rekam"
          icon="stop-circle"
          onPress={() => {
            dispatch({ type: 'stop' });
            try { camera.current?.stopRecording(); } catch {
              dispatch({ type: 'failed', message: 'Belum dapat menghentikan kamera. Coba lagi.' });
            }
          }}
        />
      ) : !disabled ? (
        <BigButton
          testID="record-button"
          label={busy ? 'Merekam…' : !ready ? 'Menyiapkan kamera…' : manualStop ? recordLabel : `${recordLabel} (${seconds} detik)`}
          icon="radio-button-on"
          disabled={busy || !ready || mountError !== null}
          onPress={() => dispatch({ type: 'start' })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: colors.border,
  },
  ovalOuter: {
    position: 'absolute',
    top: '10%',
    left: '19%',
    width: '62%',
    height: '74%',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 0,
  },
  ovalInner: { flex: 1, borderRadius: 1000, borderWidth: 5, borderColor: '#FFFFFF' },
  ovalRecording: { borderColor: REC_RED },
  countOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  countText: { fontSize: 140, fontWeight: '900', color: '#FFFFFF', lineHeight: 160 },
  countHint: { fontSize: fontSize.large, fontWeight: '700', color: '#FFFFFF' },
  recBadge: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: REC_RED,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
  recText: { fontSize: fontSize.large, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  hint: { fontSize: fontSize.body, color: colors.text, textAlign: 'center' },
});
