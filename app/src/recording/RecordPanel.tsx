import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

import { buzz, buzzDone } from '../a11y/haptics';
import { BigButton } from '../components/BigButton';
import { ProgressBar } from '../components/ProgressBar';
import { colors, fontSize, lineHeight, overlay, radius, session, spacing, stroke, textFont } from '../theme';
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
  /** Shown under the record button only while idle, e.g. "Lihat contoh lagi". */
  footer?: ReactNode;
}

const PROGRESS_INTERVAL_MS = 100;

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
  hint = 'Posisikan wajah di dalam oval',
  footer,
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
    buzz(Haptics.ImpactFeedbackStyle.Medium);
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

  const recording = state.phase === 'recording' || state.phase === 'finishing';
  const remaining = Math.max(Math.ceil((durationMs - state.elapsedMs) / 1000), 0);
  const message = mountError ?? state.error;

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          videoQuality="480p"
          onCameraReady={() => setReady(true)}
          onMountError={() => setMountError('Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera.')}
        />
        {/* Oval face guide (Figma 46:202): dashed cream while waiting, solid danger while recording. */}
        <View pointerEvents="none" style={styles.ovalBox}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${OVAL_W} ${OVAL_H}`} accessible={false} style={StyleSheet.absoluteFill}>
            <Ellipse
              cx={OVAL_W / 2}
              cy={OVAL_H / 2}
              rx={(OVAL_W - OVAL.ovalStroke) / 2}
              ry={(OVAL_H - OVAL.ovalStroke) / 2}
              fill="none"
              stroke={recording ? colors.danger : overlay.text}
              strokeWidth={OVAL.ovalStroke}
              strokeDasharray={recording ? undefined : `${OVAL.ovalDash} ${OVAL.ovalGap}`}
            />
          </Svg>
          {state.phase === 'countdown' ? (
            <View accessible accessibilityLiveRegion="assertive" accessibilityLabel={`Mulai dalam ${state.count}`} style={styles.count}>
              <Text accessible={false} style={styles.countText}>{state.count}</Text>
            </View>
          ) : null}
          {recording ? (
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.count}>
              <Text style={styles.countText}>{remaining}</Text>
            </View>
          ) : null}
        </View>

        {recording ? (
          <View pointerEvents="none" style={styles.badge} accessible accessibilityLiveRegion="assertive" accessibilityLabel="Sedang merekam">
            <View style={styles.badgeDot} />
            <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.badgeText, textFont(true)]}>MEREKAM</Text>
          </View>
        ) : null}

        {recording ? (
          <View style={styles.bar}>
            <ProgressBar value={state.elapsedMs / durationMs} height={OVAL.barHeight} accessibilityLabel="Waktu rekam" />
          </View>
        ) : message === null && !busy ? (
          <Text maxFontSizeMultiplier={2} style={[styles.hint, textFont()]}>{hint}</Text>
        ) : null}
      </View>

      {!disabled ? (
        <BigButton
          testID="record-button"
          label={busy ? 'Merekam…' : !ready ? 'Menyiapkan kamera…' : `${recordLabel} (${seconds} detik)`}
          icon={busy ? undefined : 'videocam-outline'}
          disabled={busy || !ready || mountError !== null}
          onPress={() => dispatch({ type: 'start' })}
        />
      ) : null}

      {message !== null ? (
        <Text accessibilityRole="alert" maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>{message}</Text>
      ) : busy ? (
        <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>Tahan bunyi sampai hitungan selesai.</Text>
      ) : null}

      {!busy ? footer : null}
    </View>
  );
}

const OVAL = session.recordPanel;
// The oval keeps the 150 : 200 shape and fills 62% of the panel width (Figma 46:202 at 390 dp is 150 wide).
const OVAL_W = OVAL.ovalWidth;
const OVAL_H = OVAL.ovalHeight;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm + spacing.xs },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlay.background,
    borderWidth: stroke.thick,
    borderColor: colors.border,
  },
  ovalBox: { width: OVAL.ovalPercent, aspectRatio: OVAL_W / OVAL_H, alignItems: 'center', justifyContent: 'center' },
  count: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: OVAL.countdown, lineHeight: OVAL.countdown, includeFontPadding: false, fontWeight: '700', color: overlay.text, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: OVAL.badgeInset,
    left: OVAL.badgeInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.tile,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  badgeDot: { width: OVAL.badgeDot, height: OVAL.badgeDot, borderRadius: OVAL.badgeDot / 2, backgroundColor: colors.text },
  badgeText: { fontSize: fontSize.small, lineHeight: 20, color: colors.text },
  bar: { position: 'absolute', left: OVAL.barInset, right: OVAL.barInset, bottom: OVAL.barInset },
  hint: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: OVAL.barInset, fontSize: fontSize.small, lineHeight: lineHeight.small, color: overlay.text, textAlign: 'center' },
  note: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
