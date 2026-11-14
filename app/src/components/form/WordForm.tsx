import type { ReactNode } from 'react';
import { useNavigation, usePreventRemove } from 'expo-router'; // not from @react-navigation/native (separate context)
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { showFlash } from '../../forms/flash';
import { LIMITS, MAX_SYLLABLES } from '../../forms/limits';
import { fill, MESSAGES, messageOf, UI, type Problem } from '../../forms/messages';
import { useFormState, type Rules } from '../../forms/useFormState';
import * as word from '../../forms/validators/word';
import { newKey } from '../../forms/keys';
import type { SaveProgress, VideoInput, WordFormData } from '../../data/words';
import { spacing } from '../../theme';
import { BigButton } from '../BigButton';
import { Body } from '../Typography';
import { Screen } from '../Screen';
import { ProgressBar } from '../ProgressBar';
import { announce } from './announce';
import { Checkbox } from './Checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { FormBanner } from './FormBanner';
import { InfoNote } from '../InfoNote';
import { SyllableRow, type SyllableProblems, type SyllableValue } from './SyllableRow';
import { TextField, type TextFieldRef } from './TextField';
import { VideoField } from './VideoField';

type Values = {
  text: string;
  instruction: string;
  video: VideoInput | null;
  syllables: SyllableValue[];
  consent: boolean;
};

export interface WordFormProps {
  /** Starting values: empty for a new word, the stored word for an edit. */
  initial: WordFormData;
  /** The other words (companion's and built-in) for the duplicate check; leave out the word being edited. */
  otherWords: readonly string[];
  /** Saves; throws when it fails (the form keeps everything). `signal` aborts between uploads. */
  onSubmit: (data: WordFormData, onProgress: SaveProgress, signal: AbortSignal) => Promise<void>;
  /** Leave the form (after saving, or when the user cancels). */
  onClose: () => void;
  /** Extra action under Simpan and Batal, e.g. "Hapus kata" on the edit screen (design.md §6.6). */
  footer?: ReactNode;
}

const toValues = (d: WordFormData): Values => ({
  text: d.text,
  instruction: d.instruction,
  video: d.video,
  syllables: d.syllables.map((s) => ({ ...s, key: newKey() })),
  consent: false,
});

/** The first problem of each syllable row (text, instruction, video). */
export function syllableProblems(rows: readonly SyllableValue[]): SyllableProblems[] {
  return rows.map((r) => ({
    text: word.syllableText(r.text),
    instruction: word.instruction(r.instruction),
    video: r.video ? null : 'videoEmpty',
  }));
}
const rowErrorCount = (p: SyllableProblems[]) => p.reduce((n, r) => n + [r.text, r.instruction, r.video].filter(Boolean).length, 0);

/** The form of a word with 0–6 syllables (flow §7.7.3). The instruction is typed by hand here. */
export function WordForm({ initial, otherWords, onSubmit, onClose, footer }: WordFormProps) {
  const navigation = useNavigation();
  const start = useRef(toValues(initial)).current;
  const rules: Rules<Values> = {
    text: (v) => word.wordText(v, otherWords),
    instruction: (v) => word.instruction(v),
    video: (v) => (v ? null : 'videoEmpty'),
    syllables: (rows) => {
      const p = syllableProblems(rows);
      return rowErrorCount(p) > 0 ? 'syllableEmpty' : null;
    },
    consent: (v) => (v ? null : 'consentToSave'),
  };
  const form = useFormState<Values>(start, rules);
  const { values } = form;

  const textRef = useRef<TextFieldRef>(null);
  const instructionRef = useRef<TextFieldRef>(null);
  const [showRows, setShowRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [discarding, setDiscarding] = useState<null | (() => void)>(null);
  const abort = useRef<AbortController | null>(null);

  // Leaving with unsaved changes asks first (header, Android back, and the Batal button all land here).
  usePreventRemove(form.dirty && !saved, ({ data }) => setDiscarding(() => () => navigation.dispatch(data.action)));
  useEffect(() => {
    if (saved) onClose();
  }, [saved, onClose]);

  const rowProblems = showRows ? syllableProblems(values.syllables) : [];
  const err = (k: keyof Values) => (form.errors[k] ? messageOf(form.errors[k]!) : null);
  const matchWarning = word.syllablesMatch(values.text, values.syllables.map((s) => s.text));

  const setSyllables = (next: SyllableValue[]) => form.setValue('syllables', next);
  const move = (i: number, by: -1 | 1) => {
    const next = [...values.syllables];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setSyllables(next);
  };

  const submit = async () => {
    if (busy) return;
    setFailure(null);
    setShowRows(true);
    const result = form.submit();
    if (!result.ok) {
      const rows = rowErrorCount(syllableProblems(values.syllables));
      // the syllable rows count as one field in the form state; count every wrong row field instead
      const count = result.count - (rows > 0 ? 1 : 0) + rows;
      announce(fill(MESSAGES.errorCount, { n: count }));
      if (result.firstInvalid === 'text') textRef.current?.focus();
      else if (result.firstInvalid === 'instruction') instructionRef.current?.focus();
      return;
    }
    const data: WordFormData = {
      text: word.normalizeWord(values.text).toUpperCase(),
      instruction: word.normalizeInstruction(values.instruction),
      video: values.video,
      syllables: values.syllables.map((s) => ({
        id: s.id,
        text: word.normalizeSyllable(s.text).toUpperCase(),
        instruction: word.normalizeInstruction(s.instruction),
        video: s.video,
      })),
    };
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await onSubmit(data, (done, total) => setProgress({ done, total }), controller.signal);
      showFlash(fill(MESSAGES.wordSaved, { word: data.text.toLowerCase() }));
      setSaved(true);
    } catch {
      // Cancelled by the user: no error. Anything else: keep every value and offer "Coba lagi".
      if (!controller.signal.aborted) setFailure(MESSAGES.uploadFailed);
    } finally {
      setBusy(false);
      setProgress(null);
      abort.current = null;
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const progressText = progress && progress.total > 0 ? fill(MESSAGES.uploading, { n: Math.min(progress.done + 1, progress.total), total: progress.total, pct }) : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Body>{MESSAGES.requiredNote}</Body>
        {failure ? <FormBanner text={failure} onRetry={submit} testID="word-form-banner" /> : null}

        <TextField
          ref={textRef}
          testID="word-text"
          label="Kata lengkap"
          hint="Huruf saja. Spasi atau tanda hubung boleh di antara huruf."
          value={values.text}
          onChangeText={(t) => form.setValue('text', t)}
          onBlur={() => form.blur('text')}
          error={err('text')}
          maxLength={LIMITS.word.max}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />
        <VideoField testID="word-video" label="Video kata" value={values.video} onChange={(v) => form.setValue('video', v)} error={err('video')} />
        <TextField
          ref={instructionRef}
          testID="word-instruction"
          label="Instruksi pelafalan"
          hint={MESSAGES.instructionHint}
          value={values.instruction}
          onChangeText={(t) => form.setValue('instruction', t)}
          onBlur={() => form.blur('instruction')}
          error={err('instruction')}
          maxLength={LIMITS.instruction.max}
          multiline
          editable={!busy}
        />

        <Body>{UI.sectionSyllables}</Body>
        {values.syllables.map((s, i) => (
          <SyllableRow
            key={s.key}
            index={i}
            total={values.syllables.length}
            value={s}
            problems={rowProblems[i]}
            onChange={(next) => setSyllables(values.syllables.map((x, j) => (j === i ? next : x)))}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onRemove={() => setSyllables(values.syllables.filter((_, j) => j !== i))}
          />
        ))}
        {matchWarning ? <InfoNote text={messageOf(matchWarning)} testID="syllable-match-warning" /> : null}
        <BigButton
          label={UI.addSyllable}
          icon="add"
          variant="secondary"
          disabled={values.syllables.length >= MAX_SYLLABLES}
          onPress={() => setSyllables([...values.syllables, { key: newKey(), text: '', instruction: '', video: null }])}
          testID="add-syllable"
        />
        {values.syllables.length >= MAX_SYLLABLES ? (
          <View testID="syllables-full">
            <Body muted>{MESSAGES.syllablesFull}</Body>
          </View>
        ) : null}

        <Checkbox
          testID="consent"
          checked={values.consent}
          onToggle={() => form.setValue('consent', !values.consent)}
          text={MESSAGES.consentVideo}
          error={err('consent')}
        />

        {progressText ? (
          <View style={styles.progress} testID="upload-progress">
            <Body>{progressText}</Body>
            <ProgressBar value={pct / 100} accessibilityLabel={progressText} />
            <BigButton label={UI.cancelUpload} variant="secondary" onPress={() => abort.current?.abort()} testID="cancel-upload" />
          </View>
        ) : null}

        <BigButton label={busy ? 'Menyimpan…' : UI.save} icon="save-outline" disabled={busy} onPress={submit} testID="word-save" />
        <BigButton label={UI.cancel} variant="secondary" disabled={busy} onPress={() => navigation.goBack()} testID="word-cancel" />
        {footer && !busy ? footer : null}

        <ConfirmDialog
          visible={discarding !== null}
          title={MESSAGES.discardTitle}
          confirmLabel={MESSAGES.discardConfirm}
          cancelLabel={MESSAGES.discardKeep}
          danger
          onCancel={() => setDiscarding(null)}
          onConfirm={() => {
            const leave = discarding;
            setDiscarding(null);
            leave?.();
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { gap: spacing.sm },
});
