import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { VideoInput } from '../../data/words';
import { fill, MESSAGES, messageOf, UI, type Problem } from '../../forms/messages';
import { LIMITS } from '../../forms/limits';
import { colors, fontSize, radius, spacing, stroke } from '../../theme';
import { BigButton } from '../BigButton';
import { ConfirmDialog } from './ConfirmDialog';
import { TextField } from './TextField';
import { VideoField } from './VideoField';

export interface SyllableValue {
  /** Set for a syllable that already exists (edit). */
  id?: string;
  /** Local key for React lists; never sent anywhere. */
  key: string;
  text: string;
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
  total: number;
  value: SyllableValue;
  /** Shown only after the form was sent once. */
  problems?: SyllableProblems;
  onChange: (next: SyllableValue) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const hasContent = (v: SyllableValue) => v.text.trim() !== '' || v.instruction.trim() !== '' || v.video !== null;
const err = (p?: Problem | null) => (p ? messageOf(p) : null);

/** One syllable: text, video and instruction, with labelled Naik / Turun / Hapus buttons (no dragging). */
export function SyllableRow({ index, total, value, problems, onChange, onMoveUp, onMoveDown, onRemove }: SyllableRowProps) {
  const [confirming, setConfirming] = useState(false);
  const title = fill(UI.syllableLabel, { n: index + 1 });
  return (
    <View style={styles.box} testID={`syllable-${index + 1}`}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <TextField
        testID={`syllable-${index + 1}-text`}
        label={`${title}: tulisan`}
        value={value.text}
        onChangeText={(text) => onChange({ ...value, text })}
        error={err(problems?.text)}
        maxLength={LIMITS.syllable.max}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <VideoField
        testID={`syllable-${index + 1}-video`}
        label={`${title}: video`}
        value={value.video}
        onChange={(video) => onChange({ ...value, video })}
        error={err(problems?.video)}
      />
      <TextField
        testID={`syllable-${index + 1}-instruction`}
        label={`${title}: instruksi pelafalan`}
        hint={MESSAGES.instructionHint}
        value={value.instruction}
        onChangeText={(instruction) => onChange({ ...value, instruction })}
        error={err(problems?.instruction)}
        maxLength={LIMITS.instruction.max}
        multiline
      />
      <View style={styles.actions}>
        <BigButton label={UI.moveUp} icon="arrow-up" variant="secondary" disabled={index === 0} accessibilityLabel={`${UI.moveUp}, ${title}`} onPress={onMoveUp} testID={`syllable-${index + 1}-up`} />
        <BigButton label={UI.moveDown} icon="arrow-down" variant="secondary" disabled={index === total - 1} accessibilityLabel={`${UI.moveDown}, ${title}`} onPress={onMoveDown} testID={`syllable-${index + 1}-down`} />
        <BigButton
          label={UI.removeSyllable}
          icon="trash-outline"
          variant="secondary"
          accessibilityLabel={`${UI.removeSyllable}, ${title}`}
          onPress={() => (hasContent(value) ? setConfirming(true) : onRemove())}
          testID={`syllable-${index + 1}-remove`}
        />
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

const styles = StyleSheet.create({
  box: { gap: spacing.md, padding: spacing.md, borderRadius: radius.card, borderWidth: stroke.thick, borderColor: colors.border },
  title: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  actions: { gap: spacing.sm },
});
