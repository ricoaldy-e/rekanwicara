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
from app.api.schemas import AllosaurusResponse
from app.api.v1 import allosaurus as experiment
from tests.conftest import SECRET_FILENAME, video_file

URL = "/v1/experiments/allosaurus"


def test_disabled_by_default(client: TestClient, sample_video: bytes) -> None:
    assert client.post(URL, files=video_file(sample_video)).status_code == 404


@pytest.mark.parametrize("fails", [False, True])
def test_video_becomes_wav_and_is_cleaned(
    make_client: Callable[..., TestClient],
    sample_video: bytes,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    fails: bool,
) -> None:
    caplog.set_level(logging.DEBUG)
    temporary = tmp_path / "temporary"

    def recognize(path: Path) -> AllosaurusResponse:
        with wave.open(str(path), "rb") as audio:
            assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (
                1,
                2,
                16000,
            )
            assert 0 < audio.getnframes() <= 64000
        if fails:
            raise ApiError(503, "allosaurus_unavailable", "Model belum siap.")
        return AllosaurusResponse(phonetic_prediction=" m ɑ\n", inference_ms=12.5)

    monkeypatch.setattr(experiment, "_recognize", recognize)
    res = make_client(debug=True, tmp_dir=temporary).post(URL, files=video_file(sample_video))
    assert res.status_code == (503 if fails else 200)
    if not fails:
        assert res.json() == {
            "status": "success",
            "model": "uni2005",
            "phonetic_prediction": " m ɑ\n",
            "inference_ms": 12.5,
        }
    assert list(temporary.iterdir()) == []
    assert SECRET_FILENAME not in caplog.text and str(temporary) not in caplog.text


def test_missing_audio_and_corrupt_media_are_cleaned(
    make_client: Callable[..., TestClient],
    make_clip: Callable[..., Path],
    tmp_path: Path,
) -> None:
    temporary = tmp_path / "temporary"
    client = make_client(debug=True, tmp_dir=temporary)
    no_audio = make_clip(audio=None)
    res = client.post(URL, files=video_file(no_audio.read_bytes()))
    assert res.status_code == 422 and res.json()["detail"]["code"] == "audio_missing"
    res = client.post(URL, files=video_file(b"\0\0\0\x18ftypmp42garbage"))
    assert res.status_code == 422
    assert list(temporary.iterdir()) == []


def test_non_video_is_rejected(make_client: Callable[..., TestClient]) -> None:
    res = make_client(debug=True).post(URL, files={"file": ("test.wav", b"RIFF", "audio/wav")})
    assert res.status_code == 415


@pytest.mark.parametrize(
    "returncode,output,expected_status,code",
    [
        (1, b'{"code":"audio_too_long","message":"private.wav"}', 422, "audio_too_long"),
        (1, b'{"code":"model_missing","message":"private.wav"}', 503, "allosaurus_unavailable"),
        (1, b"private.wav invalid output", 503, "allosaurus_unavailable"),
        (
            0,
            b'{"status":"success","model":"uni2005","phonetic_prediction":"m a","inference_ms":-1}',
            503,
            "allosaurus_invalid_result",
        ),
    ],
)
def test_cli_errors_do_not_expose_stderr(
    monkeypatch: pytest.MonkeyPatch,
    returncode: int,
    output: bytes,
    expected_status: int,
    code: str,
) -> None:
    monkeypatch.setattr(experiment, "PYTHON", Path(sys.executable))
    monkeypatch.setattr(
        experiment.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=[],
            returncode=returncode,
            stdout=output,
            stderr=output,
        ),
    )
    with pytest.raises(ApiError) as error:
        experiment._recognize(Path("private.wav"))
    assert error.value.status_code == expected_status and error.value.code == code
    assert "private" not in error.value.message


@pytest.mark.parametrize("kind", ["missing", "timeout", "cannot_start"])
def test_cli_setup_and_process_failures(monkeypatch: pytest.MonkeyPatch, kind: str) -> None:
    monkeypatch.setattr(
        experiment, "PYTHON", Path("missing-runtime") if kind == "missing" else Path(sys.executable)
    )

    def fail(*args: object, **kwargs: object) -> None:
        if kind == "timeout":
            raise subprocess.TimeoutExpired("private.wav", 60)
        raise OSError("private.wav")

    monkeypatch.setattr(experiment.subprocess, "run", fail)
    with pytest.raises(ApiError) as error:
        experiment._recognize(Path("private.wav"))
    assert error.value.status_code == (504 if kind == "timeout" else 503)
    assert "private" not in error.value.message


def test_cli_success_uses_isolated_interpreter_and_keeps_raw_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(experiment, "PYTHON", Path(sys.executable))
    prediction = {
        "status": "success",
        "model": "uni2005",
        "phonetic_prediction": " m ɑ\n",
        "inference_ms": 5.5,
    }

    def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        assert command == [sys.executable, str(experiment.SCRIPT), "--file", "synthetic.wav"]
        assert kwargs["capture_output"] is True and kwargs["timeout"] == 60
        return subprocess.CompletedProcess(command, 0, json.dumps(prediction).encode(), b"")

    monkeypatch.setattr(experiment.subprocess, "run", run)
    assert experiment._recognize(Path("synthetic.wav")).model_dump() == prediction
