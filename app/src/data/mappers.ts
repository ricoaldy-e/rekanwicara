/** The one place where BE/DB shapes become UI types (docs/kontrak-fe-final.md §2, §4, §5, §8). */
import type { AnalyzeResponse, CatalogDTO, Level, ResultStatus, Status, WordDTO } from '../api/types';
import { getHint } from '../content/hints';
import type { AnalyzeResult, PracticeItem, WordPath, WordSummary } from './types';

const TO_STORED: Record<ResultStatus, Status> = { sesuai: 'hijau', mendekati: 'kuning', belum_sesuai: 'merah' };
const FROM_STORED: Record<Status, ResultStatus> = { hijau: 'sesuai', kuning: 'mendekati', merah: 'belum_sesuai' };

export const toStored = (s: ResultStatus): Status => TO_STORED[s];
export const fromStored = (s: Status): ResultStatus => FROM_STORED[s];

/** §5 rule 1: `mendekati` exists only at Level 1; at Level 2–3 it becomes `belum_sesuai`. */
export function clampStatus(level: Level, s: ResultStatus): ResultStatus;
export function clampStatus(level: Level, s: ResultStatus | null): ResultStatus | null;
export function clampStatus(level: Level, s: ResultStatus | null): ResultStatus | null {
  if (s !== 'mendekati' || level === 1) return s;
  if (__DEV__) console.warn(`analyze: "mendekati" at level ${level} shown as "belum_sesuai"`);
  return 'belum_sesuai';
}

/** Applies the per-level rules to a v2 response from the server. */
export function cleanV2(res: AnalyzeResult): AnalyzeResult {
  return {
    ...res,
    result: clampStatus(res.level, res.result),
    lip_result: clampStatus(res.level, res.lip_result),
    voice_result: clampStatus(res.level, res.voice_result),
    visuals: res.level === 1 ? res.visuals : null,
  };
}

const VOWEL_ITEM = /^l1_[aiueo]$/;

export function catalogToL1(dto: CatalogDTO): PracticeItem[] {
  // Level 1 is only the vowels a, i, u, e, o (decided 14 Nov 2026): held-vowel and loudness items are not listed.
  return dto.level_1.filter((m) => VOWEL_ITEM.test(m.id)).map((m) => ({
    key: m.id,
    itemId: m.id,
    level: 1,
    text: m.text,
    instruction: m.instruction,
    video: m.videos[0],
    source: 'default',
  }));
}

export function catalogToWords(dto: CatalogDTO): WordSummary[] {
  return dto.words.map((w) => ({ id: w.id, text: w.text, source: w.source, hasLevel2: w.has_level_2 }));
}

export function wordToPath(dto: WordDTO): WordPath {
  return {
    word: { id: dto.id, text: dto.text, source: dto.source, hasLevel2: dto.level_2.length > 0 },
    syllables: [...dto.level_2]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        key: `${s.id}#${s.position}`,
        itemId: s.id,
        level: 2,
        text: s.text,
        instruction: s.instruction,
        video: s.videos[0],
        position: s.position,
        source: dto.source,
      })),
    whole: {
      key: dto.id,
      itemId: dto.id,
      level: 3,
      text: dto.text,
      instruction: dto.level_3.instruction,
      video: dto.level_3.videos[0],
      source: dto.source,
    },
  };
}

const fromV1Status = (level: Level, s: Status | null | undefined): ResultStatus | null =>
  s ? clampStatus(level, FROM_STORED[s]) : null;

/**
 * /v1/analyze → v2 result. `level` comes from the PracticeItem (v1 levels 0–4 do not map 1:1).
 * Never copies `units` or any recognized text (§5 rule 4).
 */
export function fromV1(res: AnalyzeResponse, level: Level): AnalyzeResult {
  const message = getHint(res.hint_id) ?? '';
  const base = {
    item_id: res.item_id,
    level,
    quality_flags: [...res.quality_flags],
    engine: res.engine_version,
    processing_ms: res.processing_ms,
    feedback: { code: res.hint_id, message },
    sample: false,
  };
  if (res.status === 'retry') {
    return {
      ...base,
      status: 'retry',
      result: null,
      lip_result: null,
      voice_result: null,
      lip_feedback: null,
      voice_feedback: null,
      visuals: null,
    };
  }
  const lip = fromV1Status(level, res.indicators?.bibir);
  const voice = fromV1Status(level, res.indicators?.suara);
  // v1 has one hint: it explains the lips when they are off, otherwise the voice; none when both fit (§5 rule 5).
  const lipOff = lip !== null && lip !== 'sesuai';
  const voiceOff = voice !== null && voice !== 'sesuai';
  return {
    ...base,
    status: 'evaluated',
    result: fromV1Status(level, res.overall),
    lip_result: lip,
    voice_result: voice,
    lip_feedback: lipOff ? message || null : null,
    voice_feedback: !lipOff && voiceOff ? message || null : null,
    visuals: level === 1 ? res.visuals : null,
  };
}
