"""SPEC §6.2 quality flags: unit tests on synthetic arrays + end-to-end tests on fixture clips."""

from collections.abc import Callable
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from app.core.thresholds import get_thresholds
from app.pipeline.face import FaceFrame
from app.pipeline.features import extract_clip_features
from app.pipeline.media import prepared_media
from app.pipeline.quality import (
    AudioMetrics,
    FaceMetrics,
    audio_metrics,
    face_metrics,
    longest_run,
    quality_flags,
)
from tests.conftest import AUDIO_CLIPPED, AUDIO_SILENT, AUDIO_TONE

T = get_thresholds()
SR = 16000
RNG = np.random.default_rng(1234)
GOOD_FACE = FaceMetrics(
    n_frames=30, face_frames=30, face_frame_ratio=1.0, face_width_ratio=0.5, mouth_out_ratio=0.0
)


def noise(seconds: float, amp: float) -> np.ndarray:
    return amp * RNG.normal(0, 1, int(seconds * SR))


def tone(seconds: float, amp: float, f0: float = 180.0) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    wave = np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(4 * np.pi * f0 * t)
    return amp * (wave + 0.3 * np.sin(6 * np.pi * f0 * t)) / 1.8


def speech_clip(amp: float = 0.2, seconds: float = 1.0, pad: float = 0.5) -> np.ndarray:
    voice = tone(seconds, amp) + noise(seconds, 1e-3)
    return np.concatenate([noise(pad, 1e-3), voice, noise(pad, 1e-3)])


def audio_flags(samples: np.ndarray | None) -> tuple[list[str], AudioMetrics]:
    a = audio_metrics(samples, SR, T.quality, T.segment, T.audio)
    return quality_flags(a, GOOD_FACE, T.quality), a


# ---------- longest_run ----------


def test_longest_run_bridges_small_gaps() -> None:
    mask = np.array([0, 1, 1, 0, 1, 1, 0, 0, 0, 1], dtype=bool)
    assert longest_run(mask, max_gap=1) == (1, 6)
    assert longest_run(mask, max_gap=0) == (1, 3)
    assert longest_run(mask, max_gap=3) == (1, 10)
    assert longest_run(np.zeros(5, dtype=bool), max_gap=2) is None


# ---------- Audio flags ----------


def test_clean_speech_has_no_flags() -> None:
    flags, a = audio_flags(speech_clip())
    assert flags == []
    assert not a.noise_floor_uncertain
    assert a.speech_ms == pytest.approx(1000, abs=80)


def test_digital_silence_is_too_quiet() -> None:
    flags, a = audio_flags(np.zeros(2 * SR))
    assert "too_quiet" in flags and "too_short" in flags
    assert a.peak_db == 0.0  # -300 dB clamped


def test_missing_audio_is_too_quiet_and_short() -> None:
    flags, a = audio_flags(None)
    assert flags == ["too_quiet", "too_short"]
    assert not a.has_audio


def test_clip_shorter_than_intensity_window() -> None:
    flags, _ = audio_flags(tone(0.03, 0.2))
    assert "too_short" in flags and "too_quiet" in flags


def test_clipping_above_one_percent() -> None:
    clipped = np.clip(tone(1.0, 3.0), -1.0, 1.0)
    flags, a = audio_flags(np.concatenate([noise(0.5, 1e-3), clipped, noise(0.5, 1e-3)]))
    assert "clipping" in flags
    assert a.clip_ratio > T.quality.clip_max_ratio


def test_few_clipped_samples_are_tolerated() -> None:
    x = speech_clip()
    x[::1000] = 1.0  # 0.1% of samples at full scale
    flags, a = audio_flags(x)
    assert "clipping" not in flags
    assert 0 < a.clip_ratio < T.quality.clip_max_ratio


def test_short_utterance_is_too_short() -> None:
    flags, a = audio_flags(speech_clip(seconds=0.1, pad=1.0))
    assert flags == ["too_short"]
    assert a.speech_ms < 200


def test_speech_over_loud_noise_is_too_noisy() -> None:
    # Fan-like noise everywhere (~63 dB), speech ~12 dB above it: audible, but below the 15 dB SNR.
    x = noise(3.0, 0.03) + np.concatenate([np.zeros(SR), tone(1.0, 0.25), np.zeros(SR)])
    flags, a = audio_flags(x)
    assert a.too_noisy_evaluated and not a.noise_floor_uncertain
    assert "too_noisy" in flags
    assert "too_quiet" not in flags


# ---------- noise_floor safeguard (A1 decision) ----------


def test_full_voice_clip_floor_uncertain_no_false_flags() -> None:
    # "tahan aaa": voice for the whole clip, no silence to measure the floor from.
    flags, a = audio_flags(tone(3.0, 0.2) + noise(3.0, 1e-3))
    assert a.noise_floor_uncertain
    assert a.loud_region_voiced_ratio is not None and a.loud_region_voiced_ratio > 0.9
    assert not a.too_noisy_evaluated
    assert flags == []
    assert a.speech_ms > 2500


def test_whisper_level_full_voice_is_too_quiet() -> None:
    # Voice everywhere but below abs_speech_db: the absolute region never forms, the floor stays
    # "certain" and the relative rule (peak < floor + 10 dB) flags it.
    quiet = tone(3.0, 0.004) + noise(3.0, 1e-4)  # ~ 46 dB, under abs_speech_db
    flags, a = audio_flags(quiet)
    assert "too_quiet" in flags


def test_uncertain_floor_too_quiet_uses_absolute_peak() -> None:
    a = AudioMetrics(
        has_audio=True, duration_ms=3000, peak_db=52.0, noise_floor_db=51.0,
        noise_floor_uncertain=True, speech_start_ms=0, speech_ms=2900, speech_coverage=0.97,
        speech_median_db=51.5, loud_region_voiced_ratio=0.95, clip_ratio=0.0,
        too_noisy_evaluated=False,
    )  # fmt: skip
    assert quality_flags(a, GOOD_FACE, T.quality) == ["too_quiet"]  # 52 < abs_min_peak_db (55)
    loud = AudioMetrics(**{**a.__dict__, "peak_db": 70.0, "speech_median_db": 69.0})
    assert quality_flags(loud, GOOD_FACE, T.quality) == []  # too_noisy NOT evaluated


def test_steady_noise_is_not_mistaken_for_voice() -> None:
    flags, a = audio_flags(noise(3.0, 0.03))
    assert not a.noise_floor_uncertain
    assert a.loud_region_voiced_ratio is not None and a.loud_region_voiced_ratio < 0.5
    assert "too_quiet" in flags  # no speech above the noise


# ---------- Face flags (computed over face frames only) ----------


def lm_frame(ts: int, x0: float = 0.3, x1: float = 0.7, mouth_y: float = 0.7) -> FaceFrame:
    pts = np.zeros((478, 3), dtype=np.float32)
    pts[:, 0] = np.linspace(x0, x1, 478)
    pts[:, 1] = 0.5
    for idx in T.lips.landmarks.mouth:
        pts[idx, 1] = mouth_y
    return FaceFrame(timestamp_ms=ts, landmarks=pts, blendshapes={"jawOpen": 0.1})


def no_face(ts: int) -> FaceFrame:
    return FaceFrame(timestamp_ms=ts, landmarks=None, blendshapes=None)


def face_flags(frames: list[FaceFrame]) -> list[str]:
    fm = face_metrics(frames, T.lips.landmarks)
    clean = audio_metrics(speech_clip(), SR, T.quality, T.segment, T.audio)
    return quality_flags(clean, fm, T.quality)


def test_face_in_all_frames_no_flags() -> None:
    assert face_flags([lm_frame(i * 67) for i in range(30)]) == []


def test_face_in_under_90_percent_is_no_face() -> None:
    frames = [lm_frame(i * 67) for i in range(26)] + [no_face(i * 67) for i in range(26, 30)]
    assert face_flags(frames) == ["no_face"]  # 26/30 = 86.7%
    frames = [lm_frame(i * 67) for i in range(27)] + [no_face(i * 67) for i in range(27, 30)]
    assert face_flags(frames) == []  # 27/30 = 90%


def test_small_face_is_off_frame() -> None:
    assert face_flags([lm_frame(i * 67, 0.4, 0.6) for i in range(30)]) == ["face_off_frame"]


def test_mouth_outside_frame_is_off_frame() -> None:
    frames = [lm_frame(i * 67) for i in range(26)] + [
        lm_frame(i * 67, mouth_y=1.05) for i in range(26, 30)
    ]
    assert face_flags(frames) == ["face_off_frame"]  # 4/30 > 10%
    frames = [lm_frame(i * 67) for i in range(28)] + [
        lm_frame(i * 67, mouth_y=1.05) for i in range(28, 30)
    ]
    assert face_flags(frames) == []  # 2/30 <= 10%


def test_off_frame_counts_face_frames_only() -> None:
    # 5 face frames (1 with mouth out = 20% of FACE frames) among 30: no_face + face_off_frame.
    frames = [lm_frame(i * 67) for i in range(4)] + [lm_frame(4 * 67, mouth_y=-0.1)]
    frames += [no_face(i * 67) for i in range(5, 30)]
    fm = face_metrics(frames, T.lips.landmarks)
    assert fm.mouth_out_ratio == pytest.approx(0.2)
    assert face_flags(frames) == ["no_face", "face_off_frame"]


def test_no_frames_is_no_face() -> None:
    assert face_flags([]) == ["no_face"]


# ---------- End to end on fixture clips (ffmpeg, no model) ----------


def clip_audio_flags(clip: Path, tmp_path: Path) -> list[str]:
    with clip.open("rb") as fh, prepared_media(fh, T.media, tmp_root=tmp_path) as m:
        assert m.wav_path is not None
        samples, sr = sf.read(m.wav_path, dtype="float64")
    a = audio_metrics(samples, sr, T.quality, T.segment, T.audio)
    return quality_flags(a, GOOD_FACE, T.quality)


def test_fixture_silent_audio_is_too_quiet(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    assert "too_quiet" in clip_audio_flags(make_clip(audio=AUDIO_SILENT), tmp_path)


def test_fixture_clipped_audio_is_clipping(make_clip: Callable[..., Path], tmp_path: Path) -> None:
    assert "clipping" in clip_audio_flags(make_clip(audio=AUDIO_CLIPPED), tmp_path)


def test_fixture_clean_audio_has_no_audio_flags(
    make_clip: Callable[..., Path], tmp_path: Path
) -> None:
    assert clip_audio_flags(make_clip(audio=AUDIO_TONE), tmp_path) == []


# ---------- End to end with the real Face Landmarker ----------


@pytest.mark.requires_model
def test_fixture_without_face_is_no_face(
    make_clip: Callable[..., Path], face_model: Path, tmp_path: Path
) -> None:
    with make_clip(audio=AUDIO_TONE).open("rb") as fh:
        feats = extract_clip_features(fh, T, face_model, tmp_root=tmp_path)
    assert feats.quality_flags == ["no_face"]
    assert feats.face.face_frames == 0
    assert len(feats.frames) == pytest.approx(30, abs=1)
    assert all(f.landmarks is None and f.blendshapes is None for f in feats.frames)
    assert [f.timestamp_ms for f in feats.frames[:3]] == [0, 67, 133]
    assert feats.timings.landmarker_init_ms >= 0
    assert list(tmp_path.iterdir()) == []


@pytest.mark.requires_model
@pytest.mark.parametrize(
    ("audio", "expected"),
    [(AUDIO_SILENT, "too_quiet"), (AUDIO_CLIPPED, "clipping")],
)
def test_full_pipeline_audio_flags(
    make_clip: Callable[..., Path], face_model: Path, tmp_path: Path, audio: str, expected: str
) -> None:
    with make_clip(audio=audio).open("rb") as fh:
        feats = extract_clip_features(fh, T, face_model, tmp_root=tmp_path)
    assert expected in feats.quality_flags
    assert "no_face" in feats.quality_flags
