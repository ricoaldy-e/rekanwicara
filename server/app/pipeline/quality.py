"""Recording quality checks K1 (SPEC §6.2). Pure functions; all limits from thresholds.yaml.

noise_floor: without calibration, the 10th percentile of the clip intensity (§6.2).
Safeguard (A1): when the speech region covers more than ``floor_uncertain_coverage`` of the clip
(e.g. "tahan aaa"), the floor is uncertain. Coverage is measured relative to the floor AND against
the absolute voice level, because a clip full of voice pushes the percentile up to the voice itself;
the absolute region only counts when it is mostly voiced, so steady loud noise is not mistaken for
voice. While uncertain, too_quiet uses the absolute peak limit and too_noisy is not evaluated.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
import parselmouth

from app.core.thresholds import AudioConfig, LipLandmarks, QualityConfig, SegmentConfig
from app.pipeline.face import FaceFrame

# Praat reports digital silence as -300 dB; clamp so percentiles/medians stay meaningful.
SILENCE_DB = 0.0
# Praat needs >= 6.4 / min_pitch seconds for intensity; min_pitch 100 Hz (Praat default).
INTENSITY_MIN_PITCH_HZ = 100.0

# Order of flags in responses follows the SPEC §6.2 table.
FLAG_ORDER = ("no_face", "face_off_frame", "too_quiet", "too_noisy", "clipping", "too_short")


@dataclass(frozen=True)
class AudioMetrics:
    has_audio: bool
    duration_ms: int
    peak_db: float
    noise_floor_db: float
    noise_floor_uncertain: bool
    speech_start_ms: int | None
    speech_ms: int
    speech_coverage: float  # speech region / clip duration
    speech_median_db: float | None
    # Voiced share of the absolute-level region; only computed when the safeguard needs it.
    loud_region_voiced_ratio: float | None
    clip_ratio: float  # share of samples with |x| >= clip_amplitude
    too_noisy_evaluated: bool


@dataclass(frozen=True)
class FaceMetrics:
    n_frames: int
    face_frames: int
    face_frame_ratio: float
    face_width_ratio: float | None  # median over face frames, share of frame width
    mouth_out_ratio: float | None  # share of face frames with a mouth point outside [0, 1]


# ---------- Audio ----------


def intensity_db(samples: np.ndarray, sr: int, time_step_s: float) -> np.ndarray:
    """Praat intensity contour (dB), clamped at SILENCE_DB. Empty when the clip is too short."""
    if samples.size / sr < 6.4 / INTENSITY_MIN_PITCH_HZ:
        return np.zeros(0)
    sound = parselmouth.Sound(samples.astype(np.float64), sampling_frequency=sr)
    values = sound.to_intensity(minimum_pitch=INTENSITY_MIN_PITCH_HZ, time_step=time_step_s).values[
        0
    ]
    values = np.nan_to_num(values, nan=SILENCE_DB)
    return np.maximum(values, SILENCE_DB)


def db_frame_span_s(run: tuple[int, int], time_step_s: float) -> tuple[float, float]:
    """Approximate time span (s) of intensity frames [start, end) at a constant step."""
    return run[0] * time_step_s, run[1] * time_step_s


def voiced_ratio(
    samples: np.ndarray, sr: int, audio: AudioConfig, span_s: tuple[float, float]
) -> float:
    """Share of pitch frames inside ``span_s`` with a defined F0 (SPEC §6.5 pitch settings)."""
    sound = parselmouth.Sound(samples.astype(np.float64), sampling_frequency=sr)
    pitch = sound.to_pitch(
        time_step=audio.time_step_s,
        pitch_floor=audio.pitch_floor_hz,
        pitch_ceiling=audio.pitch_ceiling_hz,
    )
    times = pitch.xs()
    f0 = pitch.selected_array["frequency"]
    inside = (times >= span_s[0]) & (times < span_s[1])
    if not np.any(inside):
        return 0.0
    return float(np.mean(f0[inside] > 0))


def longest_run(mask: np.ndarray, max_gap: int) -> tuple[int, int] | None:
    """Longest [start, end) span of True values; gaps up to ``max_gap`` frames are bridged."""
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return None
    best = (int(idx[0]), int(idx[0]) + 1)
    start = prev = int(idx[0])
    for i in idx[1:]:
        i = int(i)
        if i - prev - 1 > max_gap:
            start = i
        prev = i
        if prev + 1 - start > best[1] - best[0]:
            best = (start, prev + 1)
    return best


def audio_metrics(
    samples: np.ndarray | None,
    sr: int,
    quality: QualityConfig,
    segment: SegmentConfig,
    audio: AudioConfig,
    calibrated_floor_db: float | None = None,  # §6.2: the calibration floor, when there is one
) -> AudioMetrics:
    if samples is None or samples.size == 0:
        return AudioMetrics(
            has_audio=False, duration_ms=0, peak_db=SILENCE_DB, noise_floor_db=SILENCE_DB,
            noise_floor_uncertain=False, speech_start_ms=None, speech_ms=0, speech_coverage=0.0,
            speech_median_db=None, loud_region_voiced_ratio=None, clip_ratio=0.0,
            too_noisy_evaluated=False,
        )  # fmt: skip

    duration_ms = round(samples.size * 1000 / sr)
    clip_ratio = float(np.mean(np.abs(samples) >= quality.clip_amplitude))
    db = intensity_db(samples, sr, audio.time_step_s)
    if db.size == 0:
        return AudioMetrics(
            has_audio=True, duration_ms=duration_ms, peak_db=SILENCE_DB, noise_floor_db=SILENCE_DB,
            noise_floor_uncertain=False, speech_start_ms=None, speech_ms=0, speech_coverage=0.0,
            speech_median_db=None, loud_region_voiced_ratio=None, clip_ratio=clip_ratio,
            too_noisy_evaluated=False,
        )  # fmt: skip

    step_ms = audio.time_step_s * 1000
    max_gap = int(segment.gap_tolerance_ms // step_ms)
    known_floor = calibrated_floor_db is not None
    floor = (
        calibrated_floor_db
        if calibrated_floor_db is not None
        else float(np.percentile(db, quality.noise_floor_percentile))
    )

    rel = longest_run(db > floor + segment.speech_margin_db, max_gap)
    # A measured floor is never "uncertain": the safeguard below is for the percentile only.
    absolute = None if known_floor else longest_run(db > quality.abs_speech_db, max_gap)

    def coverage(run: tuple[int, int] | None) -> float:
        return 0.0 if run is None else (run[1] - run[0]) / db.size

    limit = quality.floor_uncertain_coverage
    loud_voiced: float | None = None
    abs_is_voice = False
    if absolute is not None and coverage(absolute) > limit and coverage(rel) <= limit:
        # Only now is the (slower) pitch analysis needed: is the loud region voice or steady noise?
        loud_voiced = voiced_ratio(samples, sr, audio, db_frame_span_s(absolute, audio.time_step_s))
        abs_is_voice = loud_voiced >= quality.floor_uncertain_min_voiced_ratio

    uncertain = not known_floor and (coverage(rel) > limit or abs_is_voice)
    region = absolute if abs_is_voice else rel

    speech_frames = 0 if region is None else region[1] - region[0]
    return AudioMetrics(
        has_audio=True,
        duration_ms=duration_ms,
        peak_db=float(db.max()),
        noise_floor_db=floor,
        noise_floor_uncertain=uncertain,
        speech_start_ms=None if region is None else round(region[0] * step_ms),
        speech_ms=round(speech_frames * step_ms),
        speech_coverage=coverage(region),
        speech_median_db=None if region is None else float(np.median(db[region[0] : region[1]])),
        loud_region_voiced_ratio=loud_voiced,
        clip_ratio=clip_ratio,
        too_noisy_evaluated=not uncertain and region is not None,
    )


# ---------- Face ----------


def face_metrics(frames: Sequence[FaceFrame], landmarks: LipLandmarks) -> FaceMetrics:
    with_face = [f.landmarks for f in frames if f.landmarks is not None]
    n = len(frames)
    if not with_face:
        return FaceMetrics(
            n_frames=n, face_frames=0, face_frame_ratio=0.0,
            face_width_ratio=None, mouth_out_ratio=None,
        )  # fmt: skip

    widths = [float(lm[:, 0].max() - lm[:, 0].min()) for lm in with_face]
    mouth_idx = list(landmarks.mouth)
    out = 0
    for lm in with_face:
        pts = lm[mouth_idx, :2]
        if np.any((pts < 0.0) | (pts > 1.0)):
            out += 1
    return FaceMetrics(
        n_frames=n,
        face_frames=len(with_face),
        face_frame_ratio=len(with_face) / n,
        face_width_ratio=float(np.median(widths)),
        mouth_out_ratio=out / len(with_face),
    )


# ---------- Flags ----------


def quality_flags(audio: AudioMetrics, face: FaceMetrics, q: QualityConfig) -> list[str]:
    flags: set[str] = set()

    if face.n_frames == 0 or face.face_frame_ratio < q.face_min_frame_ratio:
        flags.add("no_face")
    if face.face_frames > 0:  # computed over face frames only
        too_small = (face.face_width_ratio or 0.0) < q.face_min_width_ratio
        mouth_out = (face.mouth_out_ratio or 0.0) > q.mouth_out_max_frame_ratio
        if too_small or mouth_out:
            flags.add("face_off_frame")

    if not audio.has_audio:
        flags.update({"too_quiet", "too_short"})
    else:
        if audio.noise_floor_uncertain:
            if audio.peak_db < q.abs_min_peak_db:
                flags.add("too_quiet")
        elif audio.peak_db < audio.noise_floor_db + q.quiet_margin_db:
            flags.add("too_quiet")
        if (
            audio.too_noisy_evaluated
            and audio.speech_median_db is not None
            and audio.speech_median_db - audio.noise_floor_db < q.noisy_min_snr_db
        ):
            flags.add("too_noisy")
        if audio.clip_ratio > q.clip_max_ratio:
            flags.add("clipping")
        if audio.speech_ms < q.min_speech_s * 1000:
            flags.add("too_short")

    return [f for f in FLAG_ORDER if f in flags]
