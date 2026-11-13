/** UI types built from the v2 DTOs by src/data/mappers.ts (docs/kontrak-fe-final.md §4). */
import type { AnalyzeResponseV2, Level, Source, VideoRef } from '../api/types';

export type PracticeItem = {
  key: string; // `${itemId}#${position}` for a step, itemId otherwise
  itemId: string;
  level: Level;
  text: string;
  instruction: string;
  video?: VideoRef; // videos[0]; undefined = instruction text only
  position?: number;
  source: Source;
  instructionSource?: 'ai' | 'ai_edited' | 'manual';
};

export type WordSummary = { id: string; text: string; source: Source; hasLevel2: boolean };

export type WordPath = { word: WordSummary; syllables: PracticeItem[]; whole: PracticeItem };

/** A v2 analysis with statuses already clamped per level; `sample` = mock result, not a real analysis. */
export type AnalyzeResult = AnalyzeResponseV2 & { sample: boolean };
