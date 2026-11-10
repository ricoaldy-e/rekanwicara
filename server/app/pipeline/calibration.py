"""Calibration K2 (SPEC §6.3): per-user resting lip values, noise floor and vowel anchors.

Stored as numbers only in ``DATA_DIR/calibration/{user_id}.json`` (``user_id`` is validated by the
API against a safe pattern). Without a complete calibration the §6.3 population defaults from
thresholds.yaml are used and the API adds ``"uncalibrated"`` to ``quality_flags``.
"""

from __future__ import annotations

import os
import threading
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field

from app.core.thresholds import Thresholds
from app.pipeline.audio import vowel_median
from app.pipeline.features import ClipFeatures
from app.pipeline.lips import LipRest, default_lip_rest, middle_median

Vowel = Literal["a", "i", "u"]
VOWELS: tuple[Vowel, ...] = ("a", "i", "u")
Anchors = dict[str, tuple[float, float]]  # vowel -> (F1, F2)


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RestValues(_Model):
    mouth_to_eye_ratio: float = Field(gt=0)  # mouth width / outer eye distance, lips at rest
    jaw_open: float
    rounding: float
    noise_floor_db: float


class VowelValues(_Model):
    f1: float
    f2: float
    jaw_open: float
    lip_width_ratio: float
    rounding: float


class Calibration(_Model):
    rest: RestValues | None = None
    vowels: dict[Vowel, VowelValues] = {}
    # (F1, F2) of the last green attempts per vowel (§6.3 anchor update), newest last.
    history: dict[Vowel, list[tuple[float, float]]] = {}

    @property
    def complete(self) -> bool:
        return self.rest is not None and all(v in self.vowels for v in VOWELS)


class CalibrationStore:
    def __init__(self, data_dir: Path) -> None:
        self.dir = data_dir / "calibration"
        self._lock = threading.Lock()

    def path(self, user_id: str) -> Path:
        return self.dir / f"{user_id}.json"

    def load(self, user_id: str) -> Calibration | None:
        path = self.path(user_id)
        if not path.is_file():
            return None
        return Calibration.model_validate_json(path.read_text(encoding="utf-8"))

    def update(self, user_id: str, change: Callable[[Calibration], None]) -> Calibration:
        """Load (or start) the user's calibration, apply ``change`` and write it atomically."""
        with self._lock:
            cal = self.load(user_id) or Calibration()
            change(cal)
            self.dir.mkdir(parents=True, exist_ok=True)
            tmp = self.dir / f".{uuid.uuid4().hex}.part"
            try:
                tmp.write_text(cal.model_dump_json(), encoding="utf-8")
                os.replace(tmp, self.path(user_id))
            finally:
                tmp.unlink(missing_ok=True)
            return cal


# ---------- values used by the analysis ----------


def lip_rest(cal: Calibration | None, t: Thresholds) -> LipRest:
    if cal is not None and cal.rest is not None:
        r = cal.rest
        return LipRest(
            mouth_width_rest=r.mouth_to_eye_ratio, jaw_open=r.jaw_open, rounding=r.rounding
        )
    return default_lip_rest(t)


def noise_floor(cal: Calibration | None) -> float | None:
    return cal.rest.noise_floor_db if cal is not None and cal.rest is not None else None


def anchors(cal: Calibration | None, t: Thresholds) -> Anchors:
    """Per vowel: median of the last green attempts, else the calibrated value, else the default."""
    out: Anchors = {}
    for v in VOWELS:
        history = cal.history.get(v, []) if cal is not None else []
        if history:
            recent = np.array(history[-t.calibration.anchor_history :])
            out[v] = (float(np.median(recent[:, 0])), float(np.median(recent[:, 1])))
        elif cal is not None and v in cal.vowels:
            out[v] = (cal.vowels[v].f1, cal.vowels[v].f2)
        else:
            d = getattr(t.defaults.vowel_anchors, v)
            out[v] = (d.f1, d.f2)
    return out


def record_green(cal: Calibration, vowel: Vowel, f1: float, f2: float, keep: int) -> None:
    cal.history[vowel] = [*cal.history.get(vowel, []), (f1, f2)][-keep:]


# ---------- calibration steps ----------


def speech_span(feats: ClipFeatures) -> tuple[float, float] | None:
    a = feats.audio
    if a.speech_start_ms is None or a.speech_ms <= 0:
        return None
    return float(a.speech_start_ms), float(a.speech_start_ms + a.speech_ms)


def rest_values(feats: ClipFeatures, t: Thresholds) -> RestValues | None:
    """Rest step: ``feats`` must be computed with ``raw_rest()`` (nothing subtracted)."""
    lips = feats.lips
    if not np.isfinite(lips.lip_width_ratio).any():
        return None
    k = t.lips.default_mouth_to_eye_ratio  # lip_width_ratio = width / (eye distance * k)
    db = feats.voice.intensity_db
    return RestValues(
        mouth_to_eye_ratio=float(np.nanmedian(lips.lip_width_ratio)) * k,
        jaw_open=float(np.nanmedian(lips.jaw_open)),
        rounding=float(np.nanmedian(lips.rounding)),
        # A silent clip: its median intensity is the background level.
        noise_floor_db=float(np.median(db)) if db.size else feats.audio.noise_floor_db,
    )


def raw_rest(t: Thresholds) -> LipRest:
    """Rest used while recording the rest step itself: the default width, nothing subtracted."""
    return LipRest(mouth_width_rest=t.lips.default_mouth_to_eye_ratio)


def vowel_values(feats: ClipFeatures, t: Thresholds) -> VowelValues | None:
    """Vowel step: F1/F2 (§6.5) and lip features over the middle of the speech region."""
    span = speech_span(feats)
    if span is None:
        return None
    frac = t.audio.vowel_center_fraction
    formants = vowel_median(feats.voice, span[0], span[1], frac)
    if formants is None:
        return None
    lips = feats.lips
    values = [
        middle_median(series, lips.t_ms, span[0], span[1], frac)
        for series in (lips.jaw_open, lips.lip_width_ratio, lips.rounding)
    ]
    if not all(np.isfinite(values)):
        return None
    return VowelValues(
        f1=formants[0],
        f2=formants[1],
        jaw_open=values[0],
        lip_width_ratio=values[1],
        rounding=values[2],
    )
