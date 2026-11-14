import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VideoInput } from '../../data/words';
import { cleanInstruction } from '../../forms/instructionSteps';
import { fill, MESSAGES, messageOf, UI, type Problem } from '../../forms/messages';
import * as wordRules from '../../forms/validators/word';
import { LIMITS } from '../../forms/limits';
import { colors, fontSize, iconSize, lineHeight, radius, spacing, stroke, textFont, touchTarget } from '../../theme';
import { BigButton } from '../BigButton';
import { AiInstruction } from './AiInstruction';
import { ConfirmDialog } from './ConfirmDialog';
import { InstructionSteps } from './InstructionSteps';
import { TextField, type TextFieldRef } from './TextField';
import { VideoField } from './VideoField';

export interface SyllableValue {
  /** Set for a syllable that already exists (edit). */
  id?: string;
  /** Local key for React lists; never sent anywhere. */
  key: string;
  text: string;
  /** The steps joined by line breaks. */
  instruction: string;
  video: VideoInput | null;
}

export interface SyllableProblems {
  text?: Problem | null;
  instruction?: Problem | null;
  video?: Problem | null;
}

export interface SyllableRowProps {
  index: number;
  /** The word the syllable belongs to: context for "Buat dengan AI" (kontrak §7). */
  parentWord?: string;
  total: number;
  value: SyllableValue;
  /** Shown only after the form was sent once. */
  problems?: SyllableProblems;
  /** Open (fields) or folded (one summary line). The form keeps one open at a time. */
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: SyllableValue) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const hasContent = (v: SyllableValue) => v.text.trim() !== '' || v.instruction.trim() !== '' || v.video !== null;
const err = (p?: Problem | null) => (p ? messageOf(p) : null);

/** Folded summary: the syllable, whether the video is there, and how many steps it has (Figma "Suku kata 2 (terlipat)"). */
export function summarize(v: SyllableValue, hasProblems: boolean): { text: string; ok: boolean } {
  const steps = cleanInstruction(v.instruction) === '' ? 0 : cleanInstruction(v.instruction).split('\n').length;
  const parts = [
    v.text.trim() === '' ? 'Belum diisi' : wordRules.normalizeSyllable(v.text).toUpperCase(),
    v.video ? 'Video ada' : 'Belum ada video',
    steps === 0 ? 'Belum ada instruksi' : `${steps} langkah`,
  ];
  const ok = !hasProblems && v.text.trim() !== '' && v.video !== null && steps > 0;
  return { text: parts.join(' · '), ok };
}

/** One syllable: text, video and instruction steps, with labelled Naik / Turun / Hapus buttons (no dragging). Can be folded. */
export function SyllableRow({ index, parentWord = '', total, value, problems, expanded, onToggle, onChange, onMoveUp, onMoveDown, onRemove }: SyllableRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [needText, setNeedText] = useState<'syllable' | 'word' | null>(null);
  const textRef = useRef<TextFieldRef>(null);
  const instructionRef = useRef<TextFieldRef>(null);
  const syllable = wordRules.normalizeSyllable(value.text);
  const aiRequest = syllable && parentWord ? ({ type: 'syllable', text: syllable, parent_word: parentWord } as const) : null;
  const title = fill(UI.syllableLabel, { n: index + 1 });
  const summary = summarize(value, Boolean(problems && (problems.text || problems.video || problems.instruction)));
  return (
    <View style={styles.box} testID={`syllable-${index + 1}`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${summary.text}`}
        accessibilityHint={expanded ? 'Ketuk untuk melipat' : 'Ketuk untuk membuka'}
        accessibilityState={{ expanded }}
        testID={`syllable-${index + 1}-toggle`}
        style={styles.head}
      >
        <View style={styles.headText}>
          <Text accessible={false} accessibilityRole="header" style={[styles.title, textFont(true)]}>{title}</Text>
          {expanded ? null : (
            <View style={styles.summary}>
              <Ionicons name={summary.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={iconSize.chip} color={summary.ok ? colors.success : colors.textMuted} accessible={false} />
              <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.summaryText, textFont()]}>{summary.text}</Text>
            </View>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.base} color={colors.textMuted} accessible={false} />
      </Pressable>
      {expanded ? (
        <>
          <TextField
            ref={textRef}
            testID={`syllable-${index + 1}-text`}
            label={`${title}: tulisan`}
            hint={MESSAGES.syllableHint}
            value={value.text}
            onChangeText={(text) => {
              setNeedText(null);
              onChange({ ...value, text });
            }}
            error={err(problems?.text) ?? (needText ? messageOf(needText === 'word' ? 'aiNeedWord' : 'aiNeedSyllable') : null)}
            maxLength={LIMITS.syllable.max}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <VideoField
            testID={`syllable-${index + 1}-video`}
            label={`${title}: video`}
            shownLabel="Video contoh"
            value={value.video}
            onChange={(video) => onChange({ ...value, video })}
            error={err(problems?.video)}
          />
          <InstructionSteps
            ref={instructionRef}
            testID={`syllable-${index + 1}-instruction`}
            name={title}
            value={value.instruction}
            onChange={(instruction) => onChange({ ...value, instruction })}
            error={err(problems?.instruction)}
            editable={!aiBusy}
          />
          <AiInstruction
            testID={`syllable-${index + 1}-ai`}
            name={title}
            request={aiRequest}
            instruction={value.instruction}
            onFill={(instruction) => onChange({ ...value, instruction })}
            onNeedText={() => {
              setNeedText(syllable ? 'word' : 'syllable');
              textRef.current?.focus();
            }}
            onBusyChange={setAiBusy}
            onFilled={() => instructionRef.current?.focus()}
          />
        </>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.cell}>
          <BigButton compact label={UI.moveUp} icon="arrow-up" variant="secondary" disabled={index === 0} accessibilityLabel={`${UI.moveUp}, ${title}`} onPress={onMoveUp} testID={`syllable-${index + 1}-up`} />
        </View>
        <View style={styles.cell}>
          <BigButton compact label={UI.moveDown} icon="arrow-down" variant="secondary" disabled={index === total - 1} accessibilityLabel={`${UI.moveDown}, ${title}`} onPress={onMoveDown} testID={`syllable-${index + 1}-down`} />
        </View>
        <View style={styles.cell}>
          <BigButton
            compact
            label={UI.removeSyllable}
            icon="trash-outline"
            variant="secondary"
            accessibilityLabel={`${UI.removeSyllable}, ${title}`}
            onPress={() => (hasContent(value) ? setConfirming(true) : onRemove())}
            testID={`syllable-${index + 1}-remove`}
          />
        </View>
      </View>
      <ConfirmDialog
        visible={confirming}
        title={MESSAGES.deleteSyllable}
        confirmLabel={UI.removeSyllable}
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onRemove();
        }}
      />
    </View>
  );
}

// Figma 50:567: a card (surface + hairline) with a header row, the fields and a row of three buttons.
const styles = StyleSheet.create({
  box: { gap: spacing.sm + spacing.xs, padding: spacing.md, borderRadius: radius.card, borderWidth: stroke.hairline, borderColor: colors.hairline, backgroundColor: colors.surface },
  head: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headText: { flex: 1, minWidth: 1, gap: spacing.xs },
  title: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + spacing.xs / 2 },
  summaryText: { flex: 1, minWidth: 1, fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, minWidth: 1 },
});
