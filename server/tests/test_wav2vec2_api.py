import json
import logging
import subprocess
import sys
import wave
from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.errors import ApiError
from app.api.schemas import Wav2Vec2Response
from app.api.v1 import wav2vec2 as experiment
from tests.conftest import SECRET_FILENAME, video_file

URL = "/v1/experiments/wav2vec2"
PREDICTION = {
    "status": "success",
    "model": "Wikidepia/wav2vec2-xls-r-300m-indonesian",
    "transcription": " saya tuli! ",
    "inference_ms": 3.5,
}


def test_disabled_by_default(client: TestClient, sample_video: bytes) -> None:
    assert client.post(URL, files=video_file(sample_video)).status_code == 404


@pytest.mark.parametrize("fails", [False, True])
def test_conversion_cleanup_and_raw_transcription(
    make_client: Callable[..., TestClient],
    sample_video: bytes,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    fails: bool,
) -> None:
    caplog.set_level(logging.DEBUG)
    temporary = tmp_path / "temporary"

    def recognize(path: Path) -> Wav2Vec2Response:
        with wave.open(str(path), "rb") as audio:
            assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (
                1,
                2,
                16000,
            )
            assert 0 < audio.getnframes() <= 64000
        if fails:
            raise ApiError(503, "wav2vec2_unavailable", "Model belum siap.")
        return Wav2Vec2Response(**PREDICTION)

    monkeypatch.setattr(experiment, "_recognize", recognize)
    response = make_client(debug=True, tmp_dir=temporary).post(URL, files=video_file(sample_video))
    assert response.status_code == (503 if fails else 200)
    if not fails:
        assert response.json() == PREDICTION
    assert list(temporary.iterdir()) == []
    assert SECRET_FILENAME not in caplog.text and str(temporary) not in caplog.text


@pytest.mark.parametrize("kind", ["not_video", "corrupt", "no_audio", "long"])
def test_invalid_video(
    make_client: Callable[..., TestClient],
    make_clip: Callable[..., Path],
    monkeypatch: pytest.MonkeyPatch,
    kind: str,
) -> None:
    client = make_client(debug=True)
    if kind == "not_video":
        response = client.post(URL, files=video_file(b"RIFF", "test.wav", "audio/wav"))
        assert response.status_code == 415
    elif kind == "corrupt":
        assert client.post(URL, files=video_file(b"\0\0\0\x18ftypmp42garbage")).status_code == 422
    elif kind == "no_audio":
        response = client.post(URL, files=video_file(make_clip(audio=None).read_bytes()))
        assert response.json()["detail"]["code"] == "audio_missing"
    else:

        def reject(path: Path) -> Wav2Vec2Response:
            with wave.open(str(path), "rb") as audio:
                assert audio.getnframes() == 64001
            raise ApiError(422, "audio_too_long", "Terlalu panjang.")

        monkeypatch.setattr(experiment, "_recognize", reject)
        response = client.post(URL, files=video_file(make_clip(duration=5).read_bytes()))
        assert response.status_code == 422 and response.json()["detail"]["code"] == "audio_too_long"


@pytest.mark.parametrize(
    "kind", ["missing", "timeout", "os", "invalid", "failure", "long", "success"]
)
def test_subprocess_boundary(monkeypatch: pytest.MonkeyPatch, kind: str) -> None:
    monkeypatch.setattr(
        experiment, "PYTHON", Path("missing") if kind == "missing" else Path(sys.executable)
    )

    def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        assert command == [sys.executable, "-B", str(experiment.SCRIPT), "--file", "private.wav"]
        assert kwargs["capture_output"] is True and kwargs["timeout"] == 60
        if kind == "timeout":
            raise subprocess.TimeoutExpired("private.wav", 60)
        if kind == "os":
            raise OSError("private.wav")
        if kind == "failure":
            return subprocess.CompletedProcess(command, 1, b"", b"private.wav traceback")
        if kind == "long":
            return subprocess.CompletedProcess(
                command, 1, b"", b'{"code":"audio_too_long","message":"private.wav"}'
            )
        body = {**PREDICTION, "inference_ms": -1} if kind == "invalid" else PREDICTION
        return subprocess.CompletedProcess(command, 0, json.dumps(body).encode(), b"")

    monkeypatch.setattr(experiment.subprocess, "run", run)
    if kind == "success":
        assert experiment._recognize(Path("private.wav")).model_dump() == PREDICTION
    else:
        with pytest.raises(ApiError) as error:
            experiment._recognize(Path("private.wav"))
        assert error.value.status_code == (
            504 if kind == "timeout" else 422 if kind == "long" else 503
        )
        assert "private" not in error.value.message
