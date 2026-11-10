"""Voice features (SPEC §6.5) on synthetic audio: no model needed."""

import numpy as np
import pytest

from app.core.thresholds import load_thresholds
from app.pipeline.audio import AudioSeries, audio_series, vowel_median

CFG = load_thresholds().audio
SR = 16000


def tone_in_silence() -> np.ndarray:
    """0.5 s silence, 1.0 s 150 Hz tone with harmonics, 0.5 s silence."""
    t = np.arange(SR) / SR
    tone = 0.2 * sum(np.sin(2 * np.pi * 150 * h * t) / h for h in range(1, 6))
    silence = np.zeros(SR // 2)
    return np.concatenate([silence, tone, silence])


def test_tone_is_voiced_and_silence_is_not() -> None:
    s = audio_series(tone_in_silence(), SR, CFG)
    in_tone = (s.t_ms > 600) & (s.t_ms < 1400)
    in_silence = (s.t_ms < 400) | (s.t_ms > 1600)
    assert s.voiced[in_tone].mean() > 0.95
    assert not s.voiced[in_silence].any()
    assert np.median(s.f0_hz[in_tone]) == pytest.approx(150, abs=3)
    assert s.intensity_db[in_tone].min() > s.intensity_db[in_silence].max() + 20
    # Formants only where voiced; one shared 10 ms grid.
    assert np.isnan(s.f1_hz[~s.voiced]).all() and np.isnan(s.f2_hz[~s.voiced]).all()
    assert np.isfinite(s.f1_hz[in_tone]).mean() > 0.9
    assert len({len(s.t_ms), len(s.intensity_db), len(s.voiced), len(s.f1_hz)}) == 1
    assert np.diff(s.t_ms) == pytest.approx(10.0)


def test_too_short_or_missing_audio_gives_empty_series() -> None:
    assert audio_series(None, SR, CFG).t_ms.size == 0
    assert audio_series(np.zeros(SR // 100), SR, CFG).t_ms.size == 0


def _series(f1: list[float], voiced: list[bool]) -> AudioSeries:
    n = len(f1)
    f = np.array(f1, dtype=float)
    return AudioSeries(
        t_ms=np.arange(n) * 10.0,
        intensity_db=np.full(n, 70.0),
        f0_hz=np.where(voiced, 120.0, 0.0),
        voiced=np.array(voiced),
        f1_hz=f,
        f2_hz=f * 2,
    )


def test_vowel_median_uses_the_middle_half_of_voiced_frames() -> None:
    # 10 voiced frames: the outer quarter on each side (2 + 2 frames) holds outliers.
    s = _series([100, 100, 500, 500, 500, 500, 500, 500, 900, 900], [True] * 10)
    assert vowel_median(s, 0, 100, 0.5) == (500.0, 1000.0)


def test_vowel_median_skips_unvoiced_frames_and_respects_the_window() -> None:
    s = _series([700, 300, 300, 300, 700], [False, True, True, True, False])
    assert vowel_median(s, 0, 50, 0.5) == (300.0, 600.0)
    assert vowel_median(s, 40, 50, 0.5) is None  # only an unvoiced frame in range
