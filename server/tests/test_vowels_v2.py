"""Vowel fusion on synthetic measured series and injected ASR, not human validation."""

import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
import pytest
import soundfile as sf

from app.api.errors import ApiError
from app.api.schemas import Item, V2AnalyzeResponse, Wav2Vec2Response
from app.api.v2 import vowels
from app.core.settings import Settings
from app.core.thresholds import get_thresholds
from tests import synth


def features(vowel: str, near: bool = False) -> SimpleNamespace:
    shapes = {
        "a": {"gap": 0.3, "jaw": 0.5},
        "i": {"gap": 0.3, "width": 1.2, "round": 0.0},
        "u": {"gap": 0.3, "width": 0.8, "round": 0.6},
        "e": {"gap": 0.3, "jaw": 0.25, "width": 1.2},
        "o": {"gap": 0.3, "jaw": 0.25, "round": 0.5},
    }
    shape = shapes[vowel]
    config = get_thresholds()
    if near:
        fraction = config.rules.yellow_margin / 2
        key, value = {
            "a": ("jaw", config.rules.vowels.a.jaw_open_min * (1 - fraction)),
            "i": ("width", config.rules.vowels.i.lip_width_ratio_min * (1 - fraction)),
            "u": ("round", config.rules.vowels.u.rounding_min * (1 - fraction)),
            "e": ("jaw", config.rules.vowels.e.jaw_open_max * (1 + fraction)),
            "o": ("round", config.rules.vowels.o.rounding_min * (1 - fraction)),
        }[vowel]
        shape[key] = value
    f1, f2 = {
        "a": (800, 1400),
        "i": (300, 2400),
        "u": (400, 900),
        "e": (450, 2100),
        "o": (500, 1000),
    }[vowel]
    return SimpleNamespace(
        quality_flags=[],
        audio=SimpleNamespace(
            noise_floor_uncertain=False, noise_floor_db=30, speech_start_ms=300, speech_ms=1300
        ),
        voice=synth.voice(2000, [(300, 1600)], f1=f1, f2=f2),
        lips=synth.lips(2000, [(300, 1600, shape)]),
        frames=[],
        image_size=(640, 480),
        samples=0.1 * np.sin(2 * np.pi * 180 * np.arange(32000) / 16000),
        sample_rate=16000,
    )


def recognition(text: str) -> Wav2Vec2Response:
    return Wav2Vec2Response(
        status="success",
        model="Wikidepia/wav2vec2-xls-r-300m-indonesian",
        transcription=text,
        inference_ms=1,
    )


def evaluate(vowel: str, feats: SimpleNamespace, tmp_path: Path) -> V2AnalyzeResponse:
    settings = Settings(_env_file=None, data_dir=tmp_path / "state", tmp_dir=tmp_path / "media")
    item = Item(
        item_id=f"l1_{vowel}", level=1, text=vowel, units=[vowel], priority="required", active=True
    )
    return vowels.evaluate_vowel(item, feats, None, get_thresholds(), settings, time.perf_counter())


@pytest.mark.parametrize("vowel", list("aiueo"))
@pytest.mark.parametrize("near", [False, True])
def test_vowels_combine_real_rules_with_asr_and_remove_audio(
    vowel: str, near: bool, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    paths = []

    def transcribe(path: Path, timeout: float) -> Wav2Vec2Response:
        paths.append(path)
        info = sf.info(path)
        assert (info.samplerate, info.channels, info.subtype) == (16000, 1, "PCM_16")
        assert timeout == get_thresholds().experiments.combined_asr_timeout_s
        return recognition(vowel)

    monkeypatch.setattr(vowels, "_recognize", transcribe)
    result = evaluate(vowel, features(vowel, near), tmp_path)
    assert result.status == "evaluated"
    assert result.result == ("mendekati" if near else "sesuai")
    assert result.voice_result == "sesuai" and result.visuals.vowel_point is not None
    assert result.engine == "mediapipe_parselmouth_wav2vec2"
    assert len(paths) == 1 and not paths[0].exists()
    assert list((tmp_path / "media").iterdir()) == []


@pytest.mark.parametrize("vowel", list("aiueo"))
def test_asr_mismatch_changes_final_score(
    vowel: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(vowels, "_recognize", Mock(return_value=recognition("kata lain")))
    result = evaluate(vowel, features(vowel), tmp_path)
    assert result.result == result.voice_result == "belum_sesuai"
    assert result.lip_result == "sesuai"
    assert "kata lain" not in result.model_dump_json()


@pytest.mark.parametrize(
    "text,expected",
    [
        ("A", "sesuai"),
        ("aaa", "sesuai"),
        ("a a", "sesuai"),
        ("apa", "belum_sesuai"),
        ("i", "belum_sesuai"),
        ("", None),
    ],
)
def test_sustained_vowel_is_matched_without_target_correction(
    text: str, expected: str | None, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(vowels, "_recognize", Mock(return_value=recognition(text)))
    result = evaluate("a", features("a"), tmp_path)
    assert result.result == expected
    if expected is None:
        assert (
            result.status == "retry" and result.lip_result is None and result.voice_result is None
        )
        assert "empty_transcription" in result.quality_flags


@pytest.mark.parametrize(
    "missing", ["formants", "lips", "samples", "no_face", "too_quiet", "too_short"]
)
def test_missing_signals_retry_without_running_asr(
    missing: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    feats = features("a")
    if missing == "formants":
        feats.voice.f1_hz[:] = np.nan
    elif missing == "lips":
        feats.lips.jaw_open[:] = np.nan
    elif missing == "samples":
        feats.samples = None
    else:
        feats.quality_flags = [missing]
    recognize = Mock(side_effect=AssertionError("Invalid measurements must not run ASR"))
    monkeypatch.setattr(vowels, "_recognize", recognize)
    result = evaluate("a", feats, tmp_path)
    assert (
        result.status == "retry"
        and result.result is result.lip_result is result.voice_result is None
    )
    assert not recognize.called


@pytest.mark.parametrize("status,code", [(503, "wav2vec2_unavailable"), (504, "wav2vec2_timeout")])
def test_asr_failure_preserves_error_and_cleans_temporary_audio(
    status: int, code: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(vowels, "_recognize", Mock(side_effect=ApiError(status, code, "internal")))
    with pytest.raises(ApiError) as error:
        evaluate("a", features("a"), tmp_path)
    assert error.value.status_code == status
    assert list((tmp_path / "media").iterdir()) == []


def test_acoustic_mismatch_is_not_overruled_by_matching_asr(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    feats = features("a")
    feats.voice.f1_hz[feats.voice.voiced] = 200
    monkeypatch.setattr(vowels, "_recognize", Mock(return_value=recognition("a")))
    result = evaluate("a", feats, tmp_path)
    assert result.result == result.voice_result == "belum_sesuai"
    assert result.lip_result == "sesuai"
