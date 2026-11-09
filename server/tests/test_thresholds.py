from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from app.core.thresholds import THRESHOLDS_PATH, load_thresholds


def test_yaml_loads_with_spec_values() -> None:
    t = load_thresholds()
    # §6.1
    assert (t.media.max_duration_s, t.media.fps, t.media.frame_height_px) == (4.0, 15, 480)
    assert t.media.audio_sample_rate_hz == 16000
    # §6.2
    q = t.quality
    assert q.face_min_frame_ratio == 0.90
    assert q.face_min_width_ratio == 0.25
    assert q.mouth_out_max_frame_ratio == 0.10
    assert (q.quiet_margin_db, q.noisy_min_snr_db) == (10.0, 15.0)
    assert (q.clip_amplitude, q.clip_max_ratio, q.min_speech_s) == (0.99, 0.01, 0.2)
    assert q.noise_floor_percentile == 10
    assert q.floor_uncertain_coverage == 0.85
    # §6.4 / §6.6 / §6.7 spot checks
    assert t.lips.landmarks.mouth == (13, 14, 61, 291)
    assert (t.lips.landmarks.eye_outer_left, t.lips.landmarks.eye_outer_right) == (33, 263)
    assert t.lips.closed_gap_ratio == 0.05
    assert t.segment.gap_tolerance_ms == 100
    assert t.rules.l0_hold_a.yellow_min_voiced_s == 2.55
    assert t.rules.vowels.i.lip_width_ratio_min == 1.05
    assert t.rules.consonants.p.voiced_ratio_max == 0.3


def test_a1_assumptions_are_marked() -> None:
    text = THRESHOLDS_PATH.read_text(encoding="utf-8")
    for key in ("face_min_width_ratio", "mouth_out_max_frame_ratio", "abs_speech_db"):
        line = next(ln for ln in text.splitlines() if ln.strip().startswith(f"{key}:"))
        assert "asumsi A1, disetel di A6" in line, line
    # Every assumption names the phase in which it gets tuned.
    for line in text.splitlines():
        if "asumsi A1" in line:
            assert "disetel di A6" in line, line


def test_unknown_key_is_rejected(tmp_path: Path) -> None:
    raw = yaml.safe_load(THRESHOLDS_PATH.read_text(encoding="utf-8"))
    raw["quality"]["typo_key"] = 1
    bad = tmp_path / "t.yaml"
    bad.write_text(yaml.safe_dump(raw), encoding="utf-8")
    with pytest.raises(ValidationError):
        load_thresholds(bad)


def test_missing_key_is_rejected(tmp_path: Path) -> None:
    raw = yaml.safe_load(THRESHOLDS_PATH.read_text(encoding="utf-8"))
    del raw["quality"]["clip_amplitude"]
    bad = tmp_path / "t.yaml"
    bad.write_text(yaml.safe_dump(raw), encoding="utf-8")
    with pytest.raises(ValidationError):
        load_thresholds(bad)
