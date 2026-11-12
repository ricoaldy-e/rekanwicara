/**
 * API contract v1 types. Mirrors docs/SPEC.md §5 and server/app/api/schemas.py exactly.
 * Change only together with SPEC §5.
 */

// ---------- Shared enums ----------

export type Status = 'hijau' | 'kuning' | 'merah';
export type ResponseStatus = 'ok' | 'retry';
/** SPEC §4/§7: the MVP always scores with rules. */
export type ScorerName = 'rules';
export type Priority = 'required' | 'bonus';
export type CalibrationStep = 'rest' | 'vowel_a' | 'vowel_i' | 'vowel_u';
export type MockVariant = 'hijau' | 'kuning' | 'merah' | 'retry';
export type UploadPurpose = 'dataset' | 'model_video';
export type RecordingCondition = 'quiet' | 'noisy';

/** SPEC §6.2 (+ "uncalibrated" from §6.3, which never causes a retry). */
export type QualityFlag =
  | 'no_face'
  | 'face_off_frame'
  | 'too_quiet'
  | 'too_noisy'
  | 'clipping'
  | 'too_short'
  | 'uncalibrated';

/** SPEC §6.9. */
export type ReasonCode =
  | 'l0_duration_short'
  | 'l0_loudness_flat'
  | 'vowel_open_low'
  | 'vowel_spread_low'
  | 'vowel_round_low'
  | 'vowel_acoustic_mismatch'
  | 'closure_missing'
  | 'closure_voicing_expected'
  | 'closure_voicing_unexpected'
  | 'hum_open'
  | 'hum_short';

// ---------- GET /v1/health ----------

export interface HealthResponse {
  status: 'ok';
  engine_version: string;
  scorer_mode: ScorerName;
  mock_mode: boolean;
}

// ---------- GET /v1/items ----------

export interface Item {
  item_id: string;
  level: number; // 0..4
  text: string;
  units: string[];
  priority: Priority;
  emoji: string | null;
  active: boolean;
}

/** Response of GET /v1/items (active items only). */
export type ItemsResponse = Item[];

// ---------- POST /v1/calibrate ----------

export interface CalibrateRequest {
  file: UploadFile;
  user_id: string;
  step: CalibrationStep;
}

export interface CalibrateResponse {
  status: ResponseStatus;
  step: CalibrationStep;
  quality_flags: QualityFlag[];
  saved: boolean;
  calibration_complete: boolean;
  engine_version: string;
}

// ---------- POST /v1/analyze ----------

export interface AnalyzeRequest {
  file: UploadFile;
  user_id: string;
  item_id: string;
  session_id: string;
}

export interface UnitResult {
  index: number;
  target: string;
  start_ms: number;
  end_ms: number;
  bibir: Status | null; // null for Level 0
  suara: Status;
  status: Status;
  reason_code: ReasonCode | null;
}

export interface Indicators {
  bibir: Status | null; // null for Level 0
  suara: Status;
}

export interface FormantPoint {
  f1: number;
  f2: number;
}

export interface VowelAnchors {
  a: FormantPoint | null;
  i: FormantPoint | null;
  u: FormantPoint | null;
}

export interface LipContour {
  points: [number, number][];
}

export interface Loudness {
  t_ms: number[];
  db: number[];
}

/** Every key is always present; a key is null when not relevant (SPEC §5). */
export interface Visuals {
  vowel_point: FormantPoint | null;
  vowel_anchors: VowelAnchors | null;
  lip_contour: LipContour | null;
  loudness: Loudness | null;
}

export interface AnalyzeResponse {
  status: ResponseStatus;
  quality_flags: QualityFlag[];
  item_id: string;
  level: number;
  overall: Status | null; // null when status == "retry"
  score: number | null; // 0..1, null when status == "retry"
  indicators: Indicators | null; // null when status == "retry"
  units: UnitResult[] | null; // null when status == "retry"
  hint_id: string;
  visuals: Visuals;
  scorer: ScorerName;
  engine_version: string;
  processing_ms: number;
}

// ---------- POST /v1/dataset/upload ----------

export interface DatasetUploadRequest {
  file: UploadFile;
  purpose: UploadPurpose;
  speaker_id: string;
  item_id: string;
  rep: number;
  intended_error: string; // "none" when there is no intended error
  condition: RecordingCondition;
  session_id: string;
  /** Optional metadata.csv `device` column (server: letters/digits/space/_.-, max 40). */
  device?: string;
}

export interface DatasetUploadResponse {
  status: 'ok';
  clip_id: string;
}

// ---------- Development-only POST /v1/experiments/allosaurus ----------

export interface AllosaurusResponse {
  status: 'success';
  model: 'uni2005';
  /** Raw IPA from the restricted Indonesian inventory; the screen formats readable labels. */
  phonetic_prediction: string;
  inference_ms: number;
}

// ---------- Errors (all endpoints) ----------

export interface Wav2Vec2Response {
  status: 'success';
  model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian';
  /** Free greedy CTC transcription, preserved without target correction. */
  transcription: string;
  inference_ms: number;
}

export interface ExperimentFailure {
  status: 'unavailable';
  code: 'audio_analysis_failed' | 'face_model_missing' | 'face_analysis_failed' |
    'wav2vec2_unavailable' | 'wav2vec2_timeout' | 'wav2vec2_invalid_result';
}

export interface CombinedAudio {
  status: 'ok';
  duration_ms: number;
  active_ms: number;
  warnings: ('silent' | 'too_short')[];
}

export interface CombinedVisual {
  status: 'ok';
  n_frames: number;
  face_frames: number;
  warnings: ('no_face' | 'face_off_frame' | 'motion_missing')[];
  gate: 'passed' | 'retry';
  motion_steps: number;
  lip_contour: LipContour | null;
}

export interface CombinedResponse {
  status: 'complete' | 'partial';
  target: 'tolong' | 'saya tuli' | 'hai' | 'makan';
  feedback: {
    outcome: 'berhasil' | 'mendekati' | 'coba_lagi' | null;
    reason: 'matched' | 'near_match' | 'different_text' | 'empty_text' | 'visual_gate' |
      'silent_audio' | 'short_audio' | 'component_unavailable';
  };
  asr: Wav2Vec2Response | ExperimentFailure;
  audio: CombinedAudio | ExperimentFailure;
  visual: CombinedVisual | ExperimentFailure;
  timings: { media_ms: number; audio_ms: number; visual_ms: number; asr_ms: number };
  processing_ms: number;
}

export interface ErrorDetail {
  code: string;
  message: string;
}

export interface ErrorResponse {
  detail: ErrorDetail;
}

// ---------- App-side helper ----------

/** A local file for multipart upload in React Native (e.g. an expo-camera recording). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string; // e.g. "video/mp4"
}
