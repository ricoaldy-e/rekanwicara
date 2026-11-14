"""Pydantic models for every request/response in SPEC §5 (API contract v1).

The app mirrors these in ``app/src/api/types.ts``. Change only together with SPEC §5.
"""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

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


class TutorialItem(_Strict):
    item_id: str
    word: str
    target: str
    kind: Literal["word", "syllable", "vowel"]
    level: Literal[1, 2, 3]
    position: int | None
    bucket: str
    storage_path: str
    steps: list[str]


class TutorialPresence(TutorialItem):
    present: bool


class TutorialsResponse(_Strict):
    items: list[TutorialPresence]
    max_duration_s: int
    max_upload_mb: int


class TutorialUploadResponse(_Strict):
    status: Literal["verified"] = "verified"
    item_id: str
    bucket: str
    storage_path: str
    size_bytes: int


class AccountDeletionResponse(_Strict):
    status: Literal["deleted"] = "deleted"


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


# ---------- API v2: clarified contract and latest endpoint requirements ----------


class VideoReference(_Strict):
    bucket: str
    path: str
    position: int = Field(ge=1)
    available: bool = True


class V2Material(_Strict):
    id: str
    text: str
    instruction: str
    videos: list[VideoReference] = Field(max_length=1)


class V2WordSummary(_Strict):
    id: str
    text: str
    source: Literal["default", "custom"]
    has_level_2: bool
    automatic_evaluation: bool = True


class V2Catalog(_Strict):
    level_1: list[V2Material]
    words: list[V2WordSummary]


class V2Syllable(V2Material):
    position: int = Field(ge=1)
    videos: list[VideoReference] = Field(min_length=1, max_length=1)


class V2WordStage(_Strict):
    instruction: str
    videos: list[VideoReference] = Field(min_length=1, max_length=1)


class V2WordDetail(_Strict):
    id: str
    text: str
    source: Literal["default", "custom"]
    syllable_split: str | None = None
    automatic_evaluation: bool = True
    level_2: list[V2Syllable]
    level_3: V2WordStage


class V2ItemDetail(V2Material):
    level: Literal[1, 2, 3]
    automatic_evaluation: bool = True


ManualText = Annotated[str, StringConstraints(min_length=1, max_length=30, pattern=r"^[A-Za-z]+$")]
ManualInstruction = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)
]


class CustomSyllableWrite(_Strict):
    id: UUID
    text: ManualText
    instruction: ManualInstruction
    position: int = Field(ge=1, le=6)
    video: bool = True
    video_path: str | None = Field(default=None, min_length=1, max_length=600)


class CustomWordWrite(_Strict):
    id: UUID | None = None
    word: ManualText
    instruction: ManualInstruction
    status: Literal["draft", "published"] = "published"
    video: bool = True
    video_path: str | None = Field(default=None, min_length=1, max_length=600)
    syllables: list[CustomSyllableWrite] = Field(default_factory=list, max_length=6)
    revision: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_syllables(self) -> "CustomWordWrite":
        if len({part.id for part in self.syllables}) != len(self.syllables) or sorted(
            part.position for part in self.syllables
        ) != list(range(1, len(self.syllables) + 1)):
            raise ValueError("Syllable IDs and positions must be unique and consecutive")
        return self


class CustomSyllableDetail(_Strict):
    id: UUID
    text: str
    instruction: str
    position: int
    video: VideoReference | None


class CustomWordDetail(_Strict):
    id: UUID
    word: str
    instruction: str
    status: Literal["draft", "published", "deleting"]
    revision: int = Field(ge=1)
    video: VideoReference | None
    syllables: list[CustomSyllableDetail]
    cleanup_pending: bool


class CustomWordSummary(_Strict):
    id: UUID
    word: str
    status: Literal["draft", "published", "deleting"]
    revision: int = Field(ge=1)
    syllable_count: int = Field(ge=0)
    cleanup_pending: bool


class CustomWordList(_Strict):
    words: list[CustomWordSummary]
    max_upload_mb: int
    max_duration_s: int


class CustomWordDeletion(_Strict):
    id: UUID
    status: Literal["deleted", "cleanup_pending"]


V2Result = Literal["sesuai", "mendekati", "belum_sesuai"]


class V2Feedback(_Strict):
    code: str
    message: str


class V2AnalyzeResponse(_Strict):
    status: Literal["evaluated", "retry"]
    item_id: str
    level: Literal[1, 2, 3]
    result: V2Result | None
    lip_result: V2Result | None
    voice_result: V2Result | None
    feedback: V2Feedback
    quality_flags: list[str]
    visuals: Visuals | None
    engine: Literal["mediapipe_parselmouth", "mediapipe_wav2vec2", "mediapipe_parselmouth_wav2vec2"]
    processing_ms: int = Field(ge=0)

    @model_validator(mode="after")
    def consistent_result(self) -> "V2AnalyzeResponse":
        if self.status == "retry" and any(
            value is not None for value in (self.result, self.lip_result, self.voice_result)
        ):
            raise ValueError("Retry must not contain pronunciation results")
        if self.status == "evaluated" and (self.result is None or self.voice_result is None):
            raise ValueError("Evaluated response requires a real result")
        if self.level > 1 and (
            self.visuals is not None
            or "mendekati" in (self.result, self.lip_result, self.voice_result)
        ):
            raise ValueError("Levels 2 and 3 use binary results without visuals")
        return self


class InstructionRequest(_Strict):
    type: Literal["word", "syllable"]
    text: str = Field(min_length=1, max_length=200)
    parent_word: str | None = Field(default=None, min_length=1, max_length=200)


class InstructionResponse(_Strict):
    instruction: str = Field(min_length=1)


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


CommunicationTarget = Literal["tolong", "saya tuli", "hai", "makan", "pa", "ma"]
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
