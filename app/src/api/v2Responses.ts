import type { V2AnalyzeResponse, V2Catalog, V2ItemDetail, V2Material, V2Result, VideoReference, Visuals } from './types';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const result = (value: unknown): value is V2Result => value === 'sesuai' || value === 'mendekati' || value === 'belum_sesuai';
const point = (value: unknown) => object(value) && finite(value.f1) && finite(value.f2);
const video = (value: unknown): value is VideoReference => object(value) && text(value.bucket) && text(value.path) &&
  !value.path.split('/').some((part) => !part || part === '.' || part === '..') &&
  !value.path.includes('\\') && finite(value.position) && Number.isInteger(value.position) &&
  value.position >= 1 && typeof value.available === 'boolean';
const material = (value: unknown): value is V2Material => object(value) && text(value.id) &&
  text(value.text) && text(value.instruction) && Array.isArray(value.videos) && value.videos.every(video);

function visuals(value: unknown): value is Visuals | null {
  if (value === null) return true;
  if (!object(value)) return false;
  return (value.vowel_point === null || point(value.vowel_point)) &&
    (value.vowel_anchors === null || object(value.vowel_anchors) && ['a', 'i', 'u'].every((key) => point(value.vowel_anchors && (value.vowel_anchors as Record<string, unknown>)[key]))) &&
    (value.lip_contour === null || object(value.lip_contour) && Array.isArray(value.lip_contour.points) &&
      value.lip_contour.points.every((pair: unknown) => Array.isArray(pair) && pair.length === 2 && pair.every(finite))) &&
    (value.loudness === null || object(value.loudness) && Array.isArray(value.loudness.t_ms) &&
      Array.isArray(value.loudness.db) && value.loudness.t_ms.length === value.loudness.db.length &&
      value.loudness.t_ms.every(finite) && value.loudness.db.every(finite));
}

export function isV2Catalog(value: unknown): value is V2Catalog {
  return object(value) && Array.isArray(value.level_1) && value.level_1.every(material) &&
    new Set(value.level_1.map((item) => item.id)).size === value.level_1.length &&
    Array.isArray(value.words) && value.words.every((word: unknown) => object(word) && text(word.id) &&
      text(word.text) && (word.source === 'default' || word.source === 'custom') &&
      typeof word.has_level_2 === 'boolean' && typeof word.automatic_evaluation === 'boolean');
}

export function isV2Item(value: unknown): value is V2ItemDetail {
  return material(value) && object(value) && finite(value.level) && [1, 2, 3].includes(value.level) &&
    typeof value.automatic_evaluation === 'boolean';
}

export function isV2AnalyzeResponse(value: unknown): value is V2AnalyzeResponse {
  if (!object(value) || !text(value.item_id) || !finite(value.level) || ![1, 2, 3].includes(value.level) ||
    !object(value.feedback) || !text(value.feedback.code) || !text(value.feedback.message) ||
    !Array.isArray(value.quality_flags) || !value.quality_flags.every(text) ||
    !finite(value.processing_ms) || !Number.isInteger(value.processing_ms) || value.processing_ms < 0 ||
    !['mediapipe_parselmouth', 'mediapipe_wav2vec2', 'mediapipe_parselmouth_wav2vec2'].includes(String(value.engine)) ||
    !visuals(value.visuals)) return false;
  if (value.status === 'retry') return value.result === null && value.lip_result === null && value.voice_result === null;
  return value.status === 'evaluated' && result(value.result) && result(value.voice_result) &&
    (value.lip_result === null || result(value.lip_result)) &&
    (value.level === 1 || value.visuals === null && ![value.result, value.lip_result, value.voice_result].includes('mendekati'));
}
