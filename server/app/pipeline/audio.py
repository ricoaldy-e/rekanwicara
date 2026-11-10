"""Voice features (SPEC §6.5) with Parselmouth, 10 ms step, on ONE time grid.

The grid is the pitch frames (voicing is defined there); intensity is interpolated and formants
are read at those same times. ``t_ms`` is ms since the start of the audio, the clock of
``lips.LipSeries``. F1/F2 are NaN on unvoiced frames: formants of silence or noise are
meaningless (§6.5 uses voiced frames).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import parselmouth

from app.core.thresholds import AudioConfig
from app.pipeline.quality import INTENSITY_MIN_PITCH_HZ, SILENCE_DB


@dataclass(frozen=True)
class AudioSeries:
    t_ms: np.ndarray  # float, ms since audio start
    intensity_db: np.ndarray
    f0_hz: np.ndarray  # 0 where unvoiced
    voiced: np.ndarray  # bool: F0 defined (§6.5)
    f1_hz: np.ndarray  # NaN where unvoiced
    f2_hz: np.ndarray

    @staticmethod
    def empty() -> AudioSeries:
        e = np.zeros(0)
        return AudioSeries(e, e, e, e.astype(bool), e, e)


def audio_series(samples: np.ndarray | None, sr: int, cfg: AudioConfig) -> AudioSeries:
    # Praat needs >= 6.4 / min_pitch seconds for intensity (same guard as quality.intensity_db).
    if samples is None or samples.size / sr < 6.4 / INTENSITY_MIN_PITCH_HZ:
        return AudioSeries.empty()
    sound = parselmouth.Sound(samples.astype(np.float64), sampling_frequency=sr)

    pitch = sound.to_pitch(
        time_step=cfg.time_step_s,
        pitch_floor=cfg.pitch_floor_hz,
        pitch_ceiling=cfg.pitch_ceiling_hz,
    )
    times = pitch.xs()
    f0 = pitch.selected_array["frequency"]
    voiced = f0 > 0

    intensity = sound.to_intensity(minimum_pitch=INTENSITY_MIN_PITCH_HZ, time_step=cfg.time_step_s)
    db = np.maximum(np.nan_to_num(intensity.values[0], nan=SILENCE_DB), SILENCE_DB)
    db = np.interp(times, intensity.xs(), db)

    formant = sound.to_formant_burg(
        time_step=cfg.time_step_s,
        max_number_of_formants=cfg.max_number_of_formants,
        maximum_formant=cfg.maximum_formant_hz,
    )
    f1 = np.array([formant.get_value_at_time(1, t) for t in times])
    f2 = np.array([formant.get_value_at_time(2, t) for t in times])
    f1[~voiced] = np.nan
    f2[~voiced] = np.nan

    return AudioSeries(
        t_ms=times * 1000, intensity_db=db, f0_hz=f0, voiced=voiced, f1_hz=f1, f2_hz=f2
    )


def vowel_median(
    series: AudioSeries, start_ms: float, end_ms: float, center_fraction: float
) -> tuple[float, float] | None:
    """Median F1, F2 over the middle ``center_fraction`` of voiced frames in [start, end) (§6.5).

    None when the segment has no voiced frame with both formants defined.
    """
    inside = (series.t_ms >= start_ms) & (series.t_ms < end_ms) & series.voiced
    idx = np.flatnonzero(inside & np.isfinite(series.f1_hz) & np.isfinite(series.f2_hz))
    if idx.size == 0:
        return None
    cut = int(idx.size * (1 - center_fraction) / 2)
    mid = idx[cut : idx.size - cut] if idx.size - 2 * cut > 0 else idx
    return float(np.median(series.f1_hz[mid])), float(np.median(series.f2_hz[mid]))
