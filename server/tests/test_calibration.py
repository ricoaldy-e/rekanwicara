"""Calibration K2 (SPEC §6.3): storage, anchors, rest/vowel values."""

from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest

from app.core.thresholds import load_thresholds
from app.pipeline import calibration as calib
from tests import synth

T = load_thresholds()


def complete_calibration() -> calib.Calibration:
    rest = calib.RestValues(mouth_to_eye_ratio=0.6, jaw_open=0.02, rounding=0.1, noise_floor_db=30)
    vowel = {"jaw_open": 0.5, "lip_width_ratio": 1.0, "rounding": 0.0}
    return calib.Calibration(
        rest=rest,
        vowels={
            "a": calib.VowelValues(f1=750, f2=1300, **vowel),
            "i": calib.VowelValues(f1=300, f2=2300, **vowel),
            "u": calib.VowelValues(f1=350, f2=850, **vowel),
        },
    )


def test_store_round_trip_is_atomic_and_numbers_only(tmp_path: Path) -> None:
    store = calib.CalibrationStore(tmp_path)
    assert store.load("u1") is None
    saved = store.update("u1", lambda c: setattr(c, "rest", complete_calibration().rest))
    assert not saved.complete
    assert store.load("u1") == saved
    assert [p.name for p in (tmp_path / "calibration").iterdir()] == ["u1.json"]  # no .part left
    text = (tmp_path / "calibration" / "u1.json").read_text(encoding="utf-8")
    assert "mouth_to_eye_ratio" in text and ".mp4" not in text


def test_complete_needs_rest_and_three_vowels() -> None:
    cal = complete_calibration()
    assert cal.complete
    del cal.vowels["u"]
    assert not cal.complete


def test_anchors_default_then_calibrated_then_recent_green_median() -> None:
    assert calib.anchors(None, T)["a"] == (819.0, 1410.0)
    cal = complete_calibration()
    assert calib.anchors(cal, T)["a"] == (750, 1300)
    for f1 in (700, 710, 720, 2000):  # only the last N count; median resists one outlier
        calib.record_green(cal, "a", f1, 1300, keep=T.calibration.anchor_history)
    assert calib.anchors(cal, T)["a"] == (715.0, 1300.0)


def test_record_green_keeps_the_last_n() -> None:
    cal = calib.Calibration()
    for k in range(15):
        calib.record_green(cal, "i", k, k, keep=10)
    assert [f1 for f1, _ in cal.history["i"]] == list(range(5, 15))


def test_lip_rest_and_noise_floor() -> None:
    assert calib.lip_rest(None, T).rounding == T.defaults.rest_rounding
    assert calib.noise_floor(None) is None
    cal = complete_calibration()
    rest = calib.lip_rest(cal, T)
    assert (rest.mouth_width_rest, rest.jaw_open, rest.rounding) == (0.6, 0.02, 0.1)
    assert calib.noise_floor(cal) == 30


def _feats(lips, voice, start: int | None, length: int) -> SimpleNamespace:
    audio = SimpleNamespace(speech_start_ms=start, speech_ms=length, noise_floor_db=25.0)
    return SimpleNamespace(lips=lips, voice=voice, audio=audio)


def test_rest_values_from_a_silent_clip() -> None:
    lips = synth.lips(3000, [(0, 3000, {"gap": 0.01, "width": 1.1, "jaw": 0.03, "round": 0.2})])
    voice = synth.voice(3000, [])
    values = calib.rest_values(_feats(lips, voice, None, 0), T)  # type: ignore[arg-type]
    assert values is not None
    assert values.mouth_to_eye_ratio == pytest.approx(1.1 * T.lips.default_mouth_to_eye_ratio)
    assert (values.jaw_open, values.rounding, values.noise_floor_db) == (0.03, 0.2, 30.0)


def test_vowel_values_use_the_middle_of_the_speech_region() -> None:
    lips = synth.lips(2000, [(300, 1300, {"gap": 0.3, "jaw": 0.6, "width": 1.0})])
    lips.jaw_open[lips.t_ms < 500] = 0.1  # onset frames outside the middle half are ignored
    voice = synth.voice(2000, [(300, 1300)], f1=760, f2=1320)
    values = calib.vowel_values(_feats(lips, voice, 300, 1000), T)  # type: ignore[arg-type]
    assert values is not None
    assert (values.f1, values.f2, values.jaw_open) == (760, 1320, 0.6)
    assert calib.vowel_values(_feats(lips, voice, None, 0), T) is None  # type: ignore[arg-type]
    assert np.isfinite(values.lip_width_ratio)
