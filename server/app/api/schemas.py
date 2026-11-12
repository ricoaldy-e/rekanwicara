"""Pydantic models for every request/response in SPEC §5 (API contract v1).

The app mirrors these in ``app/src/api/types.ts``. Change only together with SPEC §5.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------- Shared enums ----------

Status = Literal["hijau", "kuning", "merah"]
ResponseStatus = Literal["ok", "retry"]
# SPEC §4/§7: the MVP always scores with rules; w2v/hybrid are postponed to the roadmap.
ScorerName = Literal["rules"]
Priority = Literal["required", "bonus"]
CalibrationStep = Literal["rest", "vowel_a", "vowel_i", "vowel_u"]
MockVariant = Literal["hijau", "kuning", "merah", "retry"]
UploadPurpose = Literal["dataset", "model_video"]
RecordingCondition = Literal["quiet", "noisy"]

# SPEC §6.2 (+ "uncalibrated" from §6.3, which never causes a retry).
QualityFlag = Literal[
    "no_face",
    "face_off_frame",
    "too_quiet",
    "too_noisy",
    "clipping",
    "too_short",
    "uncalibrated",
]

# SPEC §6.9.
ReasonCode = Literal[
    "l0_duration_short",
    "l0_loudness_flat",
    "vowel_open_low",
    "vowel_spread_low",
    "vowel_round_low",
    "vowel_acoustic_mismatch",
    "closure_missing",
    "closure_voicing_expected",
    "closure_voicing_unexpected",
    "hum_open",
    "hum_short",
]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------- GET /v1/health ----------


class HealthResponse(_Strict):
    status: Literal["ok"] = "ok"
    engine_version: str
    scorer_mode: ScorerName
    mock_mode: bool


# ---------- GET /v1/items ----------


class Item(_Strict):
    item_id: str = Field(pattern=r"^l[0-4]_[a-z_]+$")
    level: int = Field(ge=0, le=4)
    text: str = Field(min_length=1)
    units: list[str] = Field(min_length=1)
    priority: Priority
    emoji: str | None = None
    active: bool = True


# Response of GET /v1/items is ``list[Item]`` (active items only).


# ---------- POST /v1/calibrate ----------


class CalibrateResponse(_Strict):
    status: ResponseStatus
    step: CalibrationStep
    quality_flags: list[QualityFlag]
    saved: bool
    calibration_complete: bool
    engine_version: str


# ---------- POST /v1/analyze ----------


class UnitResult(_Strict):
    index: int = Field(ge=0)
    target: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    bibir: Status | None  # null for Level 0
    suara: Status
    status: Status
    reason_code: ReasonCode | None


class Indicators(_Strict):
    bibir: Status | None  # null for Level 0
    suara: Status


class FormantPoint(_Strict):
    f1: float
    f2: float


class VowelAnchors(_Strict):
    a: FormantPoint | None = None
    i: FormantPoint | None = None
    u: FormantPoint | None = None


class LipContour(_Strict):
    points: list[tuple[float, float]]


class Loudness(_Strict):
    t_ms: list[int]
    db: list[float]


class Visuals(_Strict):
    """Every key is always present; a key is null when not relevant (SPEC §5)."""

    vowel_point: FormantPoint | None = None
    vowel_anchors: VowelAnchors | None = None
    lip_contour: LipContour | None = None
    loudness: Loudness | None = None


class AnalyzeResponse(_Strict):
    status: ResponseStatus
    quality_flags: list[QualityFlag]
    item_id: str
    level: int = Field(ge=0, le=4)
    overall: Status | None  # null when status == "retry"
    score: float | None = Field(ge=0.0, le=1.0)  # null when status == "retry"
    indicators: Indicators | None  # null when status == "retry"
    units: list[UnitResult] | None  # null when status == "retry"
    hint_id: str
    visuals: Visuals
    scorer: ScorerName
    engine_version: str
    processing_ms: int = Field(ge=0)


# ---------- POST /v1/dataset/upload ----------


class DatasetUploadResponse(_Strict):
    status: Literal["ok"] = "ok"
    clip_id: str


# ---------- Errors (all endpoints) ----------


class ErrorDetail(_Strict):
    code: str
    message: str


class ErrorResponse(_Strict):
    detail: ErrorDetail


# ---------- GET/POST /v1/debug/features (only when DEBUG=true; NOT part of SPEC §5) ----------


class DebugStatusResponse(_Strict):
    ffmpeg: bool
    ffprobe: bool
    face_model: bool
    thresholds_loaded: bool
    mediapipe_version: str | None
    parselmouth_version: str | None


class DebugAudioSummary(_Strict):
    peak_db: float
    noise_floor_db: float
    noise_floor_uncertain: bool
    speech_start_ms: int | None
    speech_ms: int
    speech_coverage: float
    speech_median_db: float | None
    loud_region_voiced_ratio: float | None
    clip_ratio: float
    too_noisy_evaluated: bool


class Wav2Vec2Response(_Strict):
    """Free Indonesian ASR transcription, without pronunciation scores (SPEC §5)."""

    status: Literal["success"] = "success"
    model: Literal["Wikidepia/wav2vec2-xls-r-300m-indonesian"] = (
        "Wikidepia/wav2vec2-xls-r-300m-indonesian"
    )
    transcription: str
    inference_ms: float = Field(ge=0, allow_inf_nan=False)


class ExperimentFailure(_Strict):
    status: Literal["unavailable"] = "unavailable"
    code: Literal[
        "audio_analysis_failed",
        "face_model_missing",
        "face_analysis_failed",
        "wav2vec2_unavailable",
        "wav2vec2_timeout",
        "wav2vec2_invalid_result",
    ]


CommunicationTarget = Literal["tolong", "saya tuli", "hai", "makan"]
SpeechOutcome = Literal["berhasil", "mendekati", "coba_lagi"]


class SpeechFeedback(_Strict):
    outcome: SpeechOutcome | None
    reason: Literal[
        "matched",
        "near_match",
        "different_text",
        "empty_text",
        "visual_gate",
        "silent_audio",
        "short_audio",
        "component_unavailable",
    ]


class CombinedAudio(_Strict):
    status: Literal["ok"] = "ok"
    duration_ms: int = Field(ge=0)
    active_ms: int = Field(ge=0)
    warnings: list[Literal["silent", "too_short"]]


class CombinedVisual(_Strict):
    status: Literal["ok"] = "ok"
    n_frames: int = Field(ge=0)
    face_frames: int = Field(ge=0)
    warnings: list[Literal["no_face", "face_off_frame", "motion_missing"]]
    gate: Literal["passed", "retry"]
    motion_steps: int = Field(ge=0)
    lip_contour: LipContour | None


class CombinedTimings(_Strict):
    media_ms: int = Field(ge=0)
    audio_ms: int = Field(ge=0)
    visual_ms: int = Field(ge=0)
    asr_ms: int = Field(ge=0)


class CombinedResponse(_Strict):
    status: Literal["complete", "partial"]
    target: CommunicationTarget
    feedback: SpeechFeedback
    audio: CombinedAudio | ExperimentFailure
    visual: CombinedVisual | ExperimentFailure
    asr: Wav2Vec2Response | ExperimentFailure
    timings: CombinedTimings
    processing_ms: int = Field(ge=0)


class AllosaurusResponse(_Strict):
    """Raw IPA decoded with the Indonesian experiment inventory (SPEC §5)."""

    status: Literal["success"] = "success"
    model: Literal["uni2005"] = "uni2005"
    phonetic_prediction: str
    inference_ms: float = Field(ge=0, allow_inf_nan=False)


class DebugFaceSummary(_Strict):
    face_width_ratio: float | None
    mouth_out_ratio: float | None


class DebugTimings(_Strict):
    media_ms: int
    landmarker_init_ms: int
    face_detect_ms: int
    audio_ms: int
    total_ms: int


class DebugLipSeries(_Strict):
    """§6.4 per video frame; null where no face. t_ms = ms since audio start."""

    t_ms: list[int]
    jaw_open: list[float | None]
    lip_gap_ratio: list[float | None]
    lip_width_ratio: list[float | None]
    rounding: list[float | None]
    mouth_close: list[float | None]
    closed: list[bool]


class DebugVoiceSeries(_Strict):
    """§6.5 per 10 ms frame; f1/f2 null where unvoiced. t_ms = ms since audio start."""

    t_ms: list[int]
    intensity_db: list[float]
    voiced: list[bool]
    f0_hz: list[float]
    f1_hz: list[float | None]
    f2_hz: list[float | None]


class DebugFeaturesResponse(_Strict):
    status: Literal["ok"] = "ok"
    quality_flags: list[QualityFlag]
    # Extra notes, e.g. "noise_floor_uncertain". Never a cause for retry by itself.
    info: list[str]
    n_frames: int
    face_frames: int
    face_frame_pct: float
    av_offset_ms: int
    audio_duration_ms: int
    has_audio: bool
    audio: DebugAudioSummary
    face: DebugFaceSummary
    lips: DebugLipSeries
    voice: DebugVoiceSeries
    timings_ms: DebugTimings
    engine_version: str
