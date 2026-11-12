"""Typed loader for ``app/config/thresholds.yaml``.

Unknown or missing keys fail at startup, so a typo in the YAML never silently falls back to a
default.
"""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

import yaml
from pydantic import BaseModel, ConfigDict, Field

THRESHOLDS_PATH = Path(__file__).resolve().parents[1] / "config" / "thresholds.yaml"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


Ratio = Annotated[float, Field(ge=0.0, le=1.0)]


class MediaConfig(_Strict):
    max_duration_s: float = Field(gt=0)
    fps: int = Field(gt=0)
    frame_height_px: int = Field(gt=0)
    audio_sample_rate_hz: int = Field(gt=0)


class QualityConfig(_Strict):
    face_min_frame_ratio: Ratio
    face_min_width_ratio: Ratio
    mouth_out_max_frame_ratio: Ratio
    quiet_margin_db: float
    noisy_min_snr_db: float
    clip_amplitude: float = Field(gt=0, le=1.0)
    clip_max_ratio: Ratio
    min_speech_s: float = Field(ge=0)
    noise_floor_percentile: float = Field(ge=0, le=100)
    floor_uncertain_coverage: Ratio
    abs_speech_db: float
    floor_uncertain_min_voiced_ratio: Ratio
    abs_min_peak_db: float


class SegmentConfig(_Strict):
    speech_margin_db: float
    gap_tolerance_ms: int = Field(ge=0)
    closure_min_ms: int = Field(ge=0)
    closure_min_frames: int = Field(ge=1)
    closure_max_ms: int = Field(gt=0)
    release_tolerance_ms: int = Field(ge=0)
    valley_min_gap_ms: int = Field(gt=0)


class LipLandmarks(_Strict):
    upper_inner: int = Field(ge=0, lt=478)
    lower_inner: int = Field(ge=0, lt=478)
    corner_left: int = Field(ge=0, lt=478)
    corner_right: int = Field(ge=0, lt=478)
    eye_outer_left: int = Field(ge=0, lt=478)
    eye_outer_right: int = Field(ge=0, lt=478)

    @property
    def mouth(self) -> tuple[int, int, int, int]:
        return (self.upper_inner, self.lower_inner, self.corner_left, self.corner_right)


class LipsConfig(_Strict):
    landmarks: LipLandmarks
    outer_lip: tuple[Annotated[int, Field(ge=0, lt=478)], ...] = Field(min_length=3)
    default_mouth_to_eye_ratio: float = Field(gt=0)
    closed_gap_ratio: float = Field(gt=0)
    median_filter_frames: int = Field(ge=1)


class AudioConfig(_Strict):
    time_step_s: float = Field(gt=0)
    pitch_floor_hz: float = Field(gt=0)
    pitch_ceiling_hz: float = Field(gt=0)
    max_number_of_formants: int = Field(ge=1)
    maximum_formant_hz: float = Field(gt=0)
    vowel_center_fraction: Ratio


class HoldAConfig(_Strict):
    min_voiced_s: float
    yellow_min_voiced_s: float


class SoftLoudConfig(_Strict):
    min_diff_db: float
    yellow_min_diff_db: float


class VowelAConfig(_Strict):
    jaw_open_min: float
    f1_margin_hz: float


class VowelIConfig(_Strict):
    lip_width_ratio_min: float
    rounding_max: float
    f2_margin_hz: float


class VowelUConfig(_Strict):
    rounding_min: float
    lip_width_ratio_max: float
    f2_margin_hz: float


class VowelEConfig(_Strict):
    jaw_open_min: float
    jaw_open_max: float
    lip_width_ratio_min: float


class VowelOConfig(_Strict):
    rounding_min: float
    jaw_open_min: float
    jaw_open_max: float


class VowelsConfig(_Strict):
    a: VowelAConfig
    i: VowelIConfig
    u: VowelUConfig
    e: VowelEConfig
    o: VowelOConfig


class MHumConfig(_Strict):
    closed_min_ratio: Ratio
    voiced_ratio_min: Ratio
    min_duration_s: float


class PConfig(_Strict):
    voiced_ratio_max: Ratio
    yellow_voiced_ratio_max: Ratio


class BConfig(_Strict):
    voiced_ratio_min: Ratio
    yellow_voiced_ratio_min: Ratio


class MConfig(_Strict):
    voiced_ratio_min: Ratio
    bonus_closure_ms: int
    bonus_closure_db_margin: float


class ConsonantsConfig(_Strict):
    closure_min_ms: int
    p: PConfig
    b: BConfig
    m: MConfig


class RulesConfig(_Strict):
    yellow_margin: Ratio
    l0_hold_a: HoldAConfig
    l0_soft_loud: SoftLoudConfig
    vowels: VowelsConfig
    m_hum: MHumConfig
    consonants: ConsonantsConfig


class CalibrationConfig(_Strict):
    anchor_history: int = Field(ge=1)


class FormantAnchor(_Strict):
    f1: float = Field(gt=0)
    f2: float = Field(gt=0)


class DefaultAnchors(_Strict):
    a: FormantAnchor
    i: FormantAnchor
    u: FormantAnchor


class DefaultsConfig(_Strict):
    rest_jaw_open: float
    rest_rounding: float
    vowel_anchors: DefaultAnchors


class ExperimentsConfig(_Strict):
    combined_asr_timeout_s: float = Field(gt=0)
    near_similarity_min: Ratio
    short_target_max_chars: int = Field(ge=1)
    short_near_max_edits: int = Field(ge=0)
    activity_frame_ms: int = Field(gt=0)
    activity_rms_min: float = Field(gt=0, le=1)
    activity_min_ms: int = Field(gt=0)
    activity_margin_ms: int = Field(ge=0)
    motion_range_min: float = Field(gt=0)
    motion_step_min: float = Field(gt=0)
    motion_steps_min: int = Field(ge=1)


class Thresholds(_Strict):
    media: MediaConfig
    quality: QualityConfig
    segment: SegmentConfig
    lips: LipsConfig
    audio: AudioConfig
    rules: RulesConfig
    calibration: CalibrationConfig
    defaults: DefaultsConfig
    experiments: ExperimentsConfig


def load_thresholds(path: Path = THRESHOLDS_PATH) -> Thresholds:
    with path.open(encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)
    return Thresholds.model_validate(raw)


@lru_cache
def get_thresholds() -> Thresholds:
    return load_thresholds()
