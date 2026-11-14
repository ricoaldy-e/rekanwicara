import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/apiError';
import type { InstructionRequest } from '../../api/types';
import { generateInstruction } from '../../data/instructions';
import { AI, UI } from '../../forms/messages';
import { useSettings } from '../../state/settings';
import { colors, fontSize, iconSize, lineHeight, spacing, textFont, touchTarget } from '../../theme';
import { BigButton } from '../BigButton';
import { announce } from './announce';
import { ConfirmDialog } from './ConfirmDialog';
import { FieldError } from './FieldError';

const COOLDOWN_MS = 30_000;

export interface AiInstructionProps {
  /** `word`, or a `syllable` that also sends its word as context. */
  request: InstructionRequest | null;
  /** The instruction typed so far. */
  instruction: string;
  /** Fills the instruction field. The companion still reviews and saves (never saved automatically). */
  onFill: (text: string) => void;
  /** The word or syllable text is empty: the form shows its error and moves focus there. */
  onNeedText: () => void;
  /** True while a suggestion is being made: the form makes the instruction field read-only. */
  onBusyChange?: (busy: boolean) => void;
  /** Called after a suggestion arrived, to move focus to the instruction field. */
  onFilled?: () => void;
  /** Names the block for assistive tech, e.g. "Suku kata 1". */
  name?: string;
  testID: string;
}

type Failure = 'failed' | 'offline' | 'rate';

/**
 * "Buat dengan AI" (flow §7.5.2): one button per block. The AI only proposes text; the companion reviews it.
 * Asks before replacing typed text, can be cancelled, offers "Buat ulang" and one level of undo, and shows what went wrong.
 */
export function AiInstruction({ request, instruction, onFill, onNeedText, onBusyChange, onFilled, name, testID }: AiInstructionProps) {
  const { apiUrl } = useSettings();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [filled, setFilled] = useState<string | null>(null); // last suggestion; while the field still equals it, it is "not edited"
  const [previous, setPrevious] = useState<string | null>(null); // one level of undo
  const [confirming, setConfirming] = useState(false);
  const [cooling, setCooling] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const cool = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
      if (cool.current) clearTimeout(cool.current);
    },
    [],
  );

  const setBusyBoth = (b: boolean) => {
    setBusy(b);
    onBusyChange?.(b);
  };

  const run = async () => {
    if (!request) return;
    setConfirming(false);
    setFailure(null);
    const controller = new AbortController();
    abort.current = controller;
    setBusyBoth(true);
    announce(AI.working);
    try {
      const text = await generateInstruction(request, { baseUrl: apiUrl, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (instruction.trim() !== '' && instruction !== filled) setPrevious(instruction);
      setFilled(text);
      onFill(text);
      announce(AI.filled);
      onFilled?.();
    } catch (e) {
      if (controller.signal.aborted || (e instanceof ApiError && e.kind === 'cancelled')) return;
      if (e instanceof ApiError && e.code === 'GENERATION_RATE_LIMITED') {
        setFailure('rate');
        setCooling(true);
        cool.current = setTimeout(() => setCooling(false), COOLDOWN_MS);
      } else {
        setFailure(e instanceof ApiError && e.kind === 'network' ? 'offline' : 'failed');
      }
    } finally {
      setBusyBoth(false);
      abort.current = null;
    }
  };

  const press = () => {
    if (!request || request.text.trim() === '') return onNeedText();
    if (instruction.trim() !== '' && instruction !== filled) return setConfirming(true);
    void run();
  };

  const showLabel = filled !== null && instruction === filled;
  return (
    <View style={styles.wrap}>
      {busy ? (
        <View style={styles.row}>
          <View style={styles.working} accessible accessibilityLabel={AI.working} testID={`${testID}-working`}>
            <ActivityIndicator color={colors.text} />
            <Text maxFontSizeMultiplier={2} style={[styles.workingText, textFont(true)]}>{AI.loading}</Text>
          </View>
          <BigButton label={AI.cancel} variant="secondary" onPress={() => abort.current?.abort()} testID={`${testID}-cancel`} />
        </View>
      ) : (
        <BigButton
          label={filled === null ? AI.button : AI.again}
          icon="sparkles-outline"
          variant="secondary"
          disabled={cooling}
          accessibilityLabel={name ? `${filled === null ? AI.button : AI.again}, ${name}` : undefined}
          onPress={press}
          testID={testID}
        />
      )}

      <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>{AI.disclosure}</Text>

      {failure ? (
        <View style={styles.failure} testID={`${testID}-error`}>
          <FieldError text={failure === 'offline' ? AI.offline : failure === 'rate' ? AI.rateLimited : AI.failed} />
          {failure !== 'rate' ? <BigButton label={UI.retry} icon="refresh" variant="secondary" onPress={press} testID={`${testID}-retry`} /> : null}
        </View>
      ) : null}

      {showLabel ? (
        <View style={styles.label} accessible accessibilityLabel={AI.label} testID={`${testID}-label`}>
          <Ionicons name="sparkles-outline" size={iconSize.chip} color={colors.textMuted} accessible={false} />
          <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.note, styles.labelText, textFont()]}>{AI.label}</Text>
        </View>
      ) : null}

      {previous !== null ? (
        <Pressable
          onPress={() => {
            onFill(previous);
            setFilled(null);
            setPrevious(null);
          }}
          accessibilityRole="link"
          accessibilityLabel={AI.undo}
          style={styles.undo}
          testID={`${testID}-undo`}
        >
          <Text maxFontSizeMultiplier={2} style={[styles.undoText, textFont(true)]}>{AI.undo}</Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title={AI.replaceTitle}
        confirmLabel={AI.replace}
        cancelLabel={AI.cancel}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void run()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.sm },
  working: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  workingText: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  note: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  failure: { gap: spacing.sm },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + spacing.xs / 2 },
  labelText: { flex: 1, minWidth: 1 },
  undo: { minHeight: touchTarget, justifyContent: 'center' },
  undoText: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.text, textDecorationLine: 'underline' },
});
