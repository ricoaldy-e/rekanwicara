import { COMMUNICATION_TARGETS } from '../content/communication';
import type { CombinedResponse, Wav2Vec2Response } from './types';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => number(value) && Number.isInteger(value);
const flags = (value: unknown, allowed: readonly string[]): value is string[] =>
  Array.isArray(value) && value.every((flag) => typeof flag === 'string' && allowed.includes(flag));
const unavailable = (value: unknown, codes: readonly string[]) =>
  object(value) && value.status === 'unavailable' && typeof value.code === 'string' && codes.includes(value.code);

export function isWav2Vec2Response(value: unknown): value is Wav2Vec2Response {
  return object(value) && value.status === 'success' &&
    value.model === 'Wikidepia/wav2vec2-xls-r-300m-indonesian' &&
    typeof value.transcription === 'string' && number(value.inference_ms);
}

export function isCombinedResponse(value: unknown): value is CombinedResponse {
  if (!object(value) || !['complete', 'partial'].includes(String(value.status))) return false;
  const { asr, audio, visual, timings, feedback } = value;
  const validAsr = isWav2Vec2Response(asr) || unavailable(asr,
    ['wav2vec2_unavailable', 'wav2vec2_timeout', 'wav2vec2_invalid_result']);
  const validAudio = unavailable(audio, ['audio_analysis_failed']) ||
    (object(audio) && audio.status === 'ok' && integer(audio.duration_ms) && integer(audio.active_ms) &&
      audio.active_ms <= audio.duration_ms && flags(audio.warnings, ['silent', 'too_short']));
  const validVisual = unavailable(visual, ['face_model_missing', 'face_analysis_failed']) ||
    (object(visual) && visual.status === 'ok' && integer(visual.n_frames) && integer(visual.face_frames) &&
      visual.face_frames <= visual.n_frames && flags(visual.warnings, ['no_face', 'face_off_frame', 'motion_missing']) &&
      integer(visual.motion_steps) && visual.gate === (visual.warnings.length ? 'retry' : 'passed') &&
      (visual.lip_contour === null || (object(visual.lip_contour) && Array.isArray(visual.lip_contour.points) &&
        visual.lip_contour.points.length >= 3 && visual.lip_contour.points.every((point: unknown) =>
          Array.isArray(point) && point.length === 2 && point.every((coordinate: unknown) => number(coordinate) && coordinate <= 1)))));
  const partial = [asr, audio, visual].some((component) => object(component) && component.status === 'unavailable');
  if (!object(feedback) || !COMMUNICATION_TARGETS.some((item) => item.value === value.target)) return false;
  const validFeedback = partial ? feedback.outcome === null && feedback.reason === 'component_unavailable' :
    feedback.outcome === 'berhasil' && feedback.reason === 'matched' ||
    feedback.outcome === 'mendekati' && feedback.reason === 'near_match' ||
    feedback.outcome === 'coba_lagi' && ['different_text', 'empty_text', 'visual_gate', 'silent_audio', 'short_audio'].includes(String(feedback.reason));
  const canPass = object(visual) && visual.gate === 'passed' && object(audio) && Array.isArray(audio.warnings) && audio.warnings.length === 0;
  if ((feedback.outcome === 'berhasil' || feedback.outcome === 'mendekati') && !canPass) return false;
  return validAsr && validAudio && validVisual && value.status === (partial ? 'partial' : 'complete') &&
    validFeedback &&
    integer(value.processing_ms) && object(timings) &&
    ['media_ms', 'audio_ms', 'visual_ms', 'asr_ms'].every((key) => integer(timings[key]));
}
