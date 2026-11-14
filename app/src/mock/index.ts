/** Mock data shaped exactly like docs/kontrak-fe-final.md §4–§5 (EXPO_PUBLIC_USE_MOCK / ANALYZE_API=mock). */
import type { AnalyzeResponseV2, CatalogDTO, WordDTO } from '../api/types';
import { getHint } from '../content/hints';
import catalog from './catalog.json';
import custom1111 from './words/custom_1111.json';
import custom2222 from './words/custom_2222.json';
import kpAlamat from './words/kp_alamat.json';
import kpApi from './words/kp_api.json';
import kpHaus from './words/kp_haus.json';
import kpMakan from './words/kp_makan.json';
import kpObat from './words/kp_obat.json';
import kpPolisi from './words/kp_polisi.json';
import kpSakit from './words/kp_sakit.json';
import kpTolong from './words/kp_tolong.json';

export const MOCK_CATALOG = catalog as CatalogDTO;

// File names avoid ':' (not allowed on Windows); the ids inside are the contract ids.
export const MOCK_WORDS: Readonly<Record<string, WordDTO>> = Object.fromEntries(
  ([custom1111, custom2222, kpAlamat, kpApi, kpHaus, kpMakan, kpObat, kpPolisi, kpSakit, kpTolong] as WordDTO[]).map((w) => [w.id, w]),
);

/** Mock analysis results in turn: sesuai, then not quite (mendekati at L1), then retry. */
export function mockAnalyzeResponse(itemId: string, level: 1 | 2 | 3, turn: number): AnalyzeResponseV2 {
  const base = { item_id: itemId, level, quality_flags: [], engine: 'mock', processing_ms: 0 };
  const visuals =
    level === 1 ? { vowel_point: null, vowel_anchors: null, lip_contour: null, loudness: null } : null;
  switch (turn % 3) {
    case 0:
      return {
        ...base,
        status: 'evaluated',
        result: 'sesuai',
        lip_result: 'sesuai',
        voice_result: 'sesuai',
        lip_feedback: null,
        voice_feedback: null,
        feedback: { code: 'ok_good', message: getHint('ok_good') ?? '' },
        visuals,
      };
    case 1: {
      const off = level === 1 ? 'mendekati' : 'belum_sesuai';
      return {
        ...base,
        status: 'evaluated',
        result: off,
        lip_result: off,
        voice_result: 'sesuai',
        lip_feedback: getHint('a_open'),
        voice_feedback: null,
        feedback: { code: 'a_open', message: getHint('a_open') ?? '' },
        visuals,
      };
    }
    default:
      return {
        ...base,
        status: 'retry',
        result: null,
        lip_result: null,
        voice_result: null,
        lip_feedback: null,
        voice_feedback: null,
        feedback: { code: 'retry_no_face', message: getHint('retry_no_face') ?? '' },
        quality_flags: ['no_face'],
        visuals: null,
      };
  }
}
