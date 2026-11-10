"""GET/POST /v1/debug/features (DEBUG=true only)."""

import logging
from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.logging import ACCESS_LOGGER_NAME
from app.pipeline.media import WORKDIR_PREFIX
from tests.conftest import AUDIO_SILENT, AUDIO_TONE, SECRET_FILENAME, video_file

URL = "/v1/debug/features"


def test_absent_when_debug_off(client: TestClient, sample_video: bytes) -> None:
    assert client.get(URL).status_code == 404
    assert client.post(URL, files=video_file(sample_video)).status_code == 404


def test_status(make_client: Callable[..., TestClient]) -> None:
    body = make_client(debug=True).get(URL).json()
    assert body["thresholds_loaded"] is True
    assert body["ffmpeg"] is True and body["ffprobe"] is True
    assert body["mediapipe_version"] == "1.2.2"
    assert body["parselmouth_version"] == "0.4.7"


def test_model_missing_is_503(
    make_client: Callable[..., TestClient], sample_video: bytes, tmp_path: Path
) -> None:
    client = make_client(debug=True, face_model_path=tmp_path / "nope.task", tmp_dir=tmp_path / "t")
    res = client.post(URL, files=video_file(sample_video))
    assert res.status_code == 503
    assert res.json()["detail"]["code"] == "face_model_missing"


def test_rejects_non_video(make_client: Callable[..., TestClient]) -> None:
    res = make_client(debug=True).post(URL, files={"file": ("a.txt", b"hello", "text/plain")})
    assert res.status_code == 415


@pytest.mark.requires_model
def test_corrupt_video_is_422_and_cleaned(
    make_client: Callable[..., TestClient], face_model: Path, tmp_path: Path
) -> None:
    work = tmp_path / "work"
    client = make_client(debug=True, face_model_path=face_model, tmp_dir=work)
    corrupt = b"\x00\x00\x00\x18ftypmp42" + b"\x00garbage" * 500
    res = client.post(URL, files=video_file(corrupt))
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "invalid_media"
    assert list(work.iterdir()) == []


@pytest.mark.requires_model
def test_summary_for_clip_without_face(
    make_client: Callable[..., TestClient],
    make_clip: Callable[..., Path],
    face_model: Path,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    work = tmp_path / "work"
    client = make_client(debug=True, face_model_path=face_model, tmp_dir=work)
    clip = make_clip(audio=AUDIO_TONE, audio_delay_s=0.5)

    res = client.post(URL, files=video_file(clip.read_bytes()))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["quality_flags"] == ["no_face"]
    assert body["n_frames"] == pytest.approx(30, abs=1)
    assert body["face_frames"] == 0 and body["face_frame_pct"] == 0.0
    assert body["av_offset_ms"] == pytest.approx(500, abs=30)
    assert body["has_audio"] is True
    assert body["audio_duration_ms"] > 0
    assert body["info"] == []
    assert set(body["timings_ms"]) == {
        "media_ms", "landmarker_init_ms", "face_detect_ms", "audio_ms", "total_ms",
    }  # fmt: skip
    assert body["timings_ms"]["landmarker_init_ms"] >= 0
    # A2 series: one lip value per frame (null without a face), on the audio clock (audio starts
    # 500 ms after the video, so the first frame is at about -500 ms); the 0.5-1.5 s tone is voiced.
    lips, voice = body["lips"], body["voice"]
    assert len(lips["t_ms"]) == body["n_frames"]
    assert lips["t_ms"][0] == -body["av_offset_ms"]
    assert set(lips["lip_gap_ratio"]) == {None} and not any(lips["closed"])
    voiced_t = [t for t, v in zip(voice["t_ms"], voice["voiced"], strict=True) if v]
    assert voiced_t and 450 <= voiced_t[0] <= 650 and 1350 <= voiced_t[-1] <= 1550
    assert all(f is None for f, v in zip(voice["f1_hz"], voice["voiced"], strict=True) if not v)
    # Nothing left on disk, nothing identifying in the logs.
    assert list(work.iterdir()) == []
    logs = " ".join(r.getMessage() for r in caplog.records)
    assert SECRET_FILENAME not in logs
    assert WORKDIR_PREFIX not in logs
    assert str(work) not in logs
    access = [r for r in caplog.records if r.name == ACCESS_LOGGER_NAME]
    assert access and all("/v1/debug/features" in r.getMessage() for r in access[-1:])


@pytest.mark.requires_model
def test_silent_clip_reports_too_quiet(
    make_client: Callable[..., TestClient],
    make_clip: Callable[..., Path],
    face_model: Path,
) -> None:
    client = make_client(debug=True, face_model_path=face_model)
    body = client.post(URL, files=video_file(make_clip(audio=AUDIO_SILENT).read_bytes())).json()
    assert "too_quiet" in body["quality_flags"]
    assert body["audio"]["peak_db"] == 0.0
