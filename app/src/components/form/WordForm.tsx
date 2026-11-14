import type { ReactNode } from 'react';
import { useNavigation, usePreventRemove } from 'expo-router'; // not from @react-navigation/native (separate context)
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import { showFlash } from '../../forms/flash';
import { LIMITS, MAX_SYLLABLES } from '../../forms/limits';
import { fill, MESSAGES, messageOf, UI, AI } from '../../forms/messages';
import { useFormState, type Rules } from '../../forms/useFormState';
import * as word from '../../forms/validators/word';
import { newKey } from '../../forms/keys';
import { makeUuid } from '../../user/pure';
import { deleteLocalFile } from '../../recording/localFile';
import { cleanInstruction, splitSteps } from '../../forms/instructionSteps';
import type { SaveProgress, VideoInput, WordFormData } from '../../data/words';
import { colors, fontSize, lineHeight, spacing, stroke, textFont } from '../../theme';
import { BigButton } from '../BigButton';
import { AiInstruction } from './AiInstruction';
import { Body } from '../Typography';
import { WordFormScreen } from './WordFormScreen';
import { ProgressBar } from '../ProgressBar';
import { announce } from './announce';
import { Checkbox } from './Checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { FormBanner } from './FormBanner';
import { InfoNote } from '../InfoNote';
import { InstructionSteps } from './InstructionSteps';
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
  /** Screen title: "Kata baru" or "Ubah kata". */
  title?: string;
  /** Starting values: empty for a new word, the stored word for an edit. */
  initial: WordFormData;
  /** The other words (companion's and built-in) for the duplicate check; leave out the word being edited. */
  otherWords: readonly string[];
  /** Saves; throws when it fails (the form keeps everything). `signal` aborts between uploads. */
  onSubmit: (data: WordFormData, onProgress: SaveProgress, signal: AbortSignal) => Promise<void>;
  /** Leave the form (after saving, or when the user cancels). */
  onClose: () => void;
  /** Extra action under Simpan and Batal at the end of the form, e.g. "Hapus kata" on the edit screen (design.md §6.6). */
  footer?: ReactNode;
  describeError?: (error: unknown) => string;
  ownerId?: string;
}

const toValues = (d: WordFormData): Values => ({
  text: d.text,
  // An old one-paragraph instruction opens as steps (long ones are split by sentence).
  instruction: splitSteps(d.instruction).join('\n'),
  video: d.video,
  syllables: d.syllables.map((s) => ({ ...s, instruction: splitSteps(s.instruction).join('\n'), key: newKey() })),
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
export function WordForm({ title = 'Kata baru', initial, otherWords, onSubmit, onClose, footer, describeError, ownerId }: WordFormProps) {
  const navigation = useNavigation();
  const [start] = useState(() => toValues(initial));
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
  const scrollRef = useRef<ScrollViewInstance>(null);
  const reduceMotion = useReduceMotion();
  /** Top of each block (relative to the fields wrapper) and of the wrapper itself, so a wrong block can be scrolled to. */
  const spots = useRef<Record<string, number>>({});
  const spot = useCallback((key: string) => (e: LayoutChangeEvent) => { spots.current[key] = e.nativeEvent.layout.y; }, []);
  const [showRows, setShowRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  /** The one syllable card that is open; the others show a summary line. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  /** The blocked navigation action while "Buang perubahan?" is open. */
  const [discarding, setDiscarding] = useState<null | { action: Parameters<typeof navigation.dispatch>[0] }>(null);
  /** Set by "Buang": the guard is switched off first, then the blocked action runs (otherwise it is blocked again). */
  const [discarded, setDiscarded] = useState<null | { action: Parameters<typeof navigation.dispatch>[0] }>(null);
  const abort = useRef<AbortController | null>(null);
  const recordings = useRef(new Set<string>());
  useEffect(() => {
    for (const input of [values.video, ...values.syllables.map((part) => part.video)]) {
      if (input?.kind === 'new') recordings.current.add(input.file.uri);
    }
  }, [values.video, values.syllables]);
  useEffect(() => {
    const files = recordings.current;
    return () => { abort.current?.abort(); files.forEach(deleteLocalFile); files.clear(); };
  }, []);

  // Leaving with unsaved changes asks first (header, Android back, and the Batal button all land here).
  usePreventRemove(form.dirty && !saved && !discarded, ({ data }) => setDiscarding({ action: data.action }));
  useEffect(() => {
    if (discarded) navigation.dispatch(discarded.action);
  }, [discarded, navigation]);
  useEffect(() => {
    if (saved) onClose();
  }, [saved, onClose]);

  const rowProblems = showRows ? syllableProblems(values.syllables) : [];
  const err = (k: keyof Values) => (form.errors[k] ? messageOf(form.errors[k]!) : null);
  const textProblem = word.wordText(values.text, otherWords);
  const aiRequest = textProblem ? null : ({ type: 'word', text: word.normalizeWord(values.text) } as const);
  const matchWarning = word.syllablesMatch(values.text, values.syllables.map((s) => s.text));

  const setSyllables = (next: SyllableValue[]) => form.setValue('syllables', next);
  const move = (i: number, by: -1 | 1) => {
    const next = [...values.syllables];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setSyllables(next);
  };

  /** Moves the page to a block that is wrong or empty, a little below the top so its label shows. */
  const scrollTo = (key: string) => {
    // Wait a frame: a folded syllable card opens first and changes the layout.
    setTimeout(() => {
      const y = (spots.current.fields ?? 0) + (spots.current[key] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: !reduceMotion });
    }, 0);
  };

  const submit = async () => {
    if (busy) return;
    setFailure(null);
    setShowRows(true);
    const result = form.submit();
    if (!result.ok) {
      const bad = syllableProblems(values.syllables).findIndex((r) => r.text || r.instruction || r.video);
      if (bad >= 0) setOpenKey(values.syllables[bad].key); // a problem must not hide in a folded card
      // The first wrong block in the order it appears on screen (the form state orders its fields differently).
      const first =
        textProblem ? 'text'
        : !values.video ? 'video'
        : word.instruction(values.instruction) ? 'instruction'
        : bad >= 0 ? `syllable-${bad}`
        : 'consent';
      scrollTo(first);
      const rows = rowErrorCount(syllableProblems(values.syllables));
      // the syllable rows count as one field in the form state; count every wrong row field instead
      const count = result.count - (rows > 0 ? 1 : 0) + rows;
      announce(fill(MESSAGES.errorCount, { n: count }));
      if (first === 'text') textRef.current?.focus();
      else if (first === 'instruction') instructionRef.current?.focus();
      return;
    }
    const data: WordFormData = {
      text: word.normalizeWord(values.text).toUpperCase(),
      instruction: cleanInstruction(values.instruction),
      video: values.video,
      syllables: values.syllables.map((s) => ({
        id: s.id,
        text: word.normalizeSyllable(s.text).toUpperCase(),
        instruction: cleanInstruction(s.instruction),
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
    } catch (error) {
      // Cancelled by the user: no error. Anything else: keep every value and offer "Coba lagi".
      if (!controller.signal.aborted) setFailure(describeError?.(error) ?? MESSAGES.uploadFailed);
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
      <WordFormScreen
        scrollRef={scrollRef}
        title={title}
        note={MESSAGES.requiredNote}
        onBack={() => navigation.goBack()}
      >
        {failure ? <FormBanner text={failure} onRetry={submit} testID="word-form-banner" /> : null}

        <View style={styles.fields} onLayout={spot('fields')} pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}>
        <View onLayout={spot('text')}>
        <TextField
          ref={textRef}
          testID="word-text"
          label="Kata lengkap"
          hint="1 sampai 30 huruf, tanpa spasi atau tanda baca."
          value={values.text}
          onChangeText={(t) => form.setValue('text', t)}
          onBlur={() => form.blur('text')}
          error={err('text')}
          maxLength={LIMITS.word.max}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />
        </View>
        <View onLayout={spot('video')}>
        <VideoField ownerId={ownerId} testID="word-video" label="Video contoh" value={values.video} onChange={(v) => form.setValue('video', v)} error={err('video')} />
        </View>
        <View style={styles.instructionBlock} onLayout={spot('instruction')}>
        <InstructionSteps
          ref={instructionRef}
          testID="word-instruction"
          value={values.instruction}
          onChange={(t) => form.setValue('instruction', t)}
          error={err('instruction')}
          editable={!busy && !aiBusy}
        />
        <AiInstruction
          testID="word-ai"
          name="kata"
          request={aiRequest}
          instruction={values.instruction}
          onFill={(t) => form.setValue('instruction', t)}
          onNeedText={() => {
            form.setError('text', values.text.trim() === '' ? 'aiNeedWord' : textProblem);
            textRef.current?.focus();
          }}
          onBusyChange={setAiBusy}
          onFilled={() => instructionRef.current?.focus()}
        />
        </View>

        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.section, textFont(true)]}>{UI.sectionSyllables}</Text>
        {values.syllables.map((s, i) => (
          <View key={s.key} onLayout={spot(`syllable-${i}`)}>
          <SyllableRow
            ownerId={ownerId}
            index={i}
            parentWord={word.normalizeWord(values.text)}
            total={values.syllables.length}
            value={s}
            problems={rowProblems[i]}
            expanded={openKey === s.key}
            onToggle={() => setOpenKey(openKey === s.key ? null : s.key)}
            onChange={(next) => setSyllables(values.syllables.map((x, j) => (j === i ? next : x)))}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onRemove={() => setSyllables(values.syllables.filter((_, j) => j !== i))}
          />
          </View>
        ))}
        {matchWarning ? <InfoNote text={messageOf(matchWarning)} testID="syllable-match-warning" /> : null}
        <BigButton
          label={UI.addSyllable}
          icon="add"
          variant="secondary"
          disabled={values.syllables.length >= MAX_SYLLABLES}
          onPress={() => {
            const key = newKey();
            setSyllables([...values.syllables, { key, id: makeUuid(), text: '', instruction: '', video: null }]);
            setOpenKey(key); // the new card opens, the others fold
          }}
          testID="add-syllable"
        />
        <Text testID="syllables-full" maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>{MESSAGES.syllablesFull}</Text>

        <View style={styles.consentBlock} onLayout={spot('consent')}>
        <Checkbox
          testID="consent"
          checked={values.consent}
          onToggle={() => form.setValue('consent', !values.consent)}
          text={MESSAGES.consentVideo}
          error={err('consent')}
        />
        <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>{AI.warning}</Text>
        </View>
        </View>

        {/* The end of the form, reached by scrolling (the tab bar stays below): Simpan, Batal, then the screen's own extra
            action such as Hapus kata, which comes last because it is the dangerous one (design.md §2.11). */}
        <View style={styles.actions}>
          {progressText ? (
            <View style={styles.progress} testID="upload-progress">
              <Body>{progressText}</Body>
              <ProgressBar value={pct / 100} accessibilityLabel={progressText} />
              <BigButton label={UI.cancelUpload} variant="secondary" onPress={() => abort.current?.abort()} testID="cancel-upload" />
            </View>
          ) : null}
          <BigButton label={busy ? 'Menyimpan…' : UI.save} disabled={busy} onPress={submit} testID="word-save" />
          <BigButton label={UI.cancel} variant="secondary" disabled={busy} onPress={() => navigation.goBack()} testID="word-cancel" />
          {footer && !busy ? footer : null}
        </View>

        <ConfirmDialog
          visible={discarding !== null}
          title={MESSAGES.discardTitle}
          confirmLabel={MESSAGES.discardConfirm}
          cancelLabel={MESSAGES.discardKeep}
          danger
          onCancel={() => setDiscarding(null)}
          onConfirm={() => {
            setDiscarded(discarding);
            setDiscarding(null);
          }}
        />
      </WordFormScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { gap: spacing.sm },
  // The wrapper that blocks input while saving also carries the spacing the screen gives its direct children.
  fields: { gap: spacing.lg - spacing.xs },
  instructionBlock: { gap: spacing.sm },
  consentBlock: { gap: spacing.sm },
  // Last block of the form: a hairline above separates the actions from the fields.
  actions: { gap: spacing.sm + spacing.xs, paddingTop: spacing.lg - spacing.xs, borderTopWidth: stroke.hairline, borderTopColor: colors.hairline },
  section: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  note: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
