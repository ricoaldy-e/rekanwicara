import io
import logging
import subprocess
import sys
import wave
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient

from app.api.errors import ApiError
from app.api.schemas import CombinedResponse, Wav2Vec2Response
from app.api.v1 import combined as endpoint
from app.core.settings import Settings
from app.core.thresholds import get_thresholds
from app.pipeline import combined
from app.pipeline import media as media_module
from app.pipeline.face import FaceFrame, FaceModelMissing, FaceTrack
from app.pipeline.media import PreparedMedia, StreamInfo
from app.pipeline.text_match import edit_distance, normalize_text, text_outcome
from tests.conftest import SECRET_FILENAME, video_file
from tests.test_lips import SIZE, face

T = get_thresholds()
URL = "/v1/experiments/combined"
PREDICTION = Wav2Vec2Response(transcription=" saya Tuli! ", inference_ms=5.5)


@pytest.fixture
def prepared(tmp_path: Path) -> PreparedMedia:
    wav = tmp_path / "synthetic.wav"
    time = np.arange(32000) / 16000
    samples = np.where((time >= 0.5) & (time < 1.5), 0.2 * np.sin(2 * np.pi * 180 * time), 0)
    with wave.open(str(wav), "wb") as output:
        output.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        output.writeframes((samples * 32767).astype("<i2").tobytes())
    return PreparedMedia(
        tmp_path, wav, [tmp_path / "frame.png"], [0], StreamInfo(True, True, 0.0, 0.0)
    )


@pytest.fixture
def moving(monkeypatch: pytest.MonkeyPatch) -> None:
    frames = [
        face(gap, 500 + i * 67)
        for i, gap in enumerate([0.1] * 3 + [0.3] * 3 + [0.1] * 3 + [0.3] * 3)
    ]
    monkeypatch.setattr(
        combined, "track_faces", lambda *args: FaceTrack(frames=frames, image_size=SIZE)
    )


@pytest.mark.parametrize(
    "target,text,outcome",
    [
        ("tolong", " TOLONG! ", "berhasil"),
        ("saya tuli", "Saya, Tuli.", "berhasil"),
        ("tolong", "tolon", "mendekati"),
        ("makan", "makam", "mendekati"),
        ("hai", "ha", "mendekati"),
        ("hai", "hati", "mendekati"),
        ("hai", "makan", "coba_lagi"),
        ("saya tuli", "saya", "coba_lagi"),
        ("tolong", "tolong makan", "coba_lagi"),
        ("tolong", "", "coba_lagi"),
        ("pa", " PA ", "berhasil"),
        ("ma", "ma", "berhasil"),
        ("pa", "ma", "mendekati"),
        ("ma", "", "coba_lagi"),
    ],
)
def test_generic_text_categories(target: str, text: str, outcome: str) -> None:
    assert text_outcome(target, text, T.experiments) == outcome


def test_unicode_distance_and_config_boundaries() -> None:
    assert normalize_text("  SAYA\n“TULI”  ") == "saya tuli"
    assert normalize_text("e\u0301") == normalize_text("é")
    assert edit_distance("tolong", "tolon") == 1
    assert edit_distance("", "hai") == 3
    assert (
        text_outcome(
            "makan", "makam", T.experiments.model_copy(update={"near_similarity_min": 0.81})
        )
        == "coba_lagi"
    )
    assert (
        text_outcome("hai", "ha", T.experiments.model_copy(update={"short_near_max_edits": 0}))
        == "coba_lagi"
    )


def test_both_gates_pass_and_keep_raw_text(prepared: PreparedMedia, moving: None) -> None:
    before = prepared.wav_path.read_bytes()
    calls = []

    def recognize(path: Path) -> Wav2Vec2Response:
        calls.append(path)
        assert path.read_bytes() == before
        return PREDICTION

    result = combined.analyze_combined(prepared, T, Path("model"), recognize, 12, "saya tuli")
    assert result.status == "complete" and result.asr == PREDICTION
    assert result.feedback.outcome == "berhasil" and result.feedback.reason == "matched"
    assert result.visual.gate == "passed" and result.visual.motion_steps >= 2
    assert result.audio.active_ms == 1000 and calls == [prepared.wav_path]
    assert len(result.visual.lip_contour.points) == len(T.lips.outer_lip)
    assert prepared.wav_path.read_bytes() == before


@pytest.mark.parametrize(
    "text,outcome", [("tolon", "mendekati"), ("makan", "coba_lagi"), ("", "coba_lagi")]
)
def test_real_gate_with_text_categories(
    prepared: PreparedMedia, moving: None, text: str, outcome: str
) -> None:
    result = combined.analyze_combined(
        prepared,
        T,
        Path("model"),
        lambda _: Wav2Vec2Response(transcription=text, inference_ms=1),
        0,
        "tolong",
    )
    assert result.visual.gate == "passed" and result.feedback.outcome == outcome


@pytest.mark.parametrize(
    "kind", ["no_face", "static", "outside_audio", "silent", "short", "offset"]
)
def test_matching_text_never_bypasses_recording_gate(
    prepared: PreparedMedia,
    monkeypatch: pytest.MonkeyPatch,
    kind: str,
) -> None:
    frames = [
        face(gap, 500 + i * 67)
        for i, gap in enumerate([0.1] * 3 + [0.3] * 3 + [0.1] * 3 + [0.3] * 3)
    ]
    if kind == "no_face":
        frames = [FaceFrame(frame.timestamp_ms, None, None) for frame in frames]
    elif kind == "static":
        frames = [face(0.2, frame.timestamp_ms) for frame in frames]
    elif kind == "outside_audio":
        frames = [face(0.1 if i < 3 or i >= 6 else 0.3, i * 30) for i in range(12)]
    elif kind == "offset":
        prepared = PreparedMedia(
            prepared.workdir,
            prepared.wav_path,
            prepared.frame_paths,
            prepared.frame_timestamps_ms,
            StreamInfo(True, True, 0.0, 2.0),
        )
    else:
        samples = np.zeros(32000, dtype="<i2")
        if kind == "short":
            samples[8000:8800] = 10000
        with wave.open(str(prepared.wav_path), "wb") as output:
            output.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
            output.writeframes(samples.tobytes())
    monkeypatch.setattr(
        combined, "track_faces", lambda *args: FaceTrack(frames=frames, image_size=SIZE)
    )
    result = combined.analyze_combined(
        prepared, T, Path("model"), lambda _: PREDICTION, 0, "saya tuli"
    )
    assert result.feedback.outcome == "coba_lagi" and result.asr == PREDICTION
    assert result.feedback.reason == (
        "silent_audio" if kind == "silent" else "short_audio" if kind == "short" else "visual_gate"
    )


def test_gap_motion_ignores_camera_translation(
    prepared: PreparedMedia, monkeypatch: pytest.MonkeyPatch
) -> None:
    frames = [face(0.2, 500 + i * 67) for i in range(12)]
    for i, frame in enumerate(frames):
        frame.landmarks[:, :2] += i * 0.002
    monkeypatch.setattr(
        combined, "track_faces", lambda *args: FaceTrack(frames=frames, image_size=SIZE)
    )
    result = combined.analyze_combined(
        prepared, T, Path("model"), lambda _: PREDICTION, 0, "saya tuli"
    )
    assert result.visual.gate == "retry" and result.feedback.outcome == "coba_lagi"


@pytest.mark.parametrize(
    "stage,code",
    [
        ("audio", "audio_analysis_failed"),
        ("visual", "face_analysis_failed"),
        ("missing", "face_model_missing"),
        ("asr", "wav2vec2_unavailable"),
        ("timeout", "wav2vec2_timeout"),
    ],
)
def test_failures_are_unavailable_not_wrong_speech(
    prepared: PreparedMedia, moving: None, monkeypatch: pytest.MonkeyPatch, stage: str, code: str
) -> None:
    def fail(*args: object, **kwargs: object) -> None:
        if stage == "missing":
            raise FaceModelMissing("private.wav")
        if stage == "timeout":
            raise ApiError(504, code, "private.wav")
        raise RuntimeError("private.wav")

    if stage == "audio":
        monkeypatch.setattr(combined, "observe_audio", fail)
    elif stage in ("visual", "missing"):
        monkeypatch.setattr(combined, "track_faces", fail)
    result = combined.analyze_combined(
        prepared,
        T,
        Path("model"),
        fail if stage in ("asr", "timeout") else lambda _: PREDICTION,
        0,
        "saya tuli",
    )
    assert result.status == "partial" and result.feedback.outcome is None
    assert result.feedback.reason == "component_unavailable" and code in result.model_dump_json()
    assert "private" not in result.model_dump_json()


def test_new_pipeline_can_load_and_check_audio_without_parselmouth(prepared: PreparedMedia) -> None:
    code = """import sys
sys.modules['parselmouth']=None
from pathlib import Path
from app.pipeline.combined import observe_audio
from app.pipeline.media import PreparedMedia,StreamInfo
from app.core.thresholds import get_thresholds
p=Path(sys.argv[1])
r=observe_audio(PreparedMedia(p.parent,p,[],[],StreamInfo(True,True,0,0)),get_thresholds())
assert r.result.active_ms>0
"""
    result = subprocess.run(
        [sys.executable, "-B", "-c", code, str(prepared.wav_path)],
        capture_output=True,
        cwd=Path(__file__).resolve().parents[1],
        check=False,
    )
    assert result.returncode == 0


def test_endpoint_disabled(client: TestClient, sample_video: bytes) -> None:
    assert (
        client.post(URL, files=video_file(sample_video), data={"target": "tolong"}).status_code
        == 404
    )


@pytest.mark.parametrize("fails", [False, True])
def test_endpoint_one_conversion_cleanup(
    make_client: Callable[..., TestClient],
    sample_video: bytes,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    fails: bool,
) -> None:
    calls = []
    original = media_module.extract

    def extract(*args: object, **kwargs: object) -> None:
        calls.append("extract")
        original(*args, **kwargs)

    monkeypatch.setattr(media_module, "extract", extract)

    def recognize(path: Path, timeout_s: float) -> Wav2Vec2Response:
        assert path.is_file() and timeout_s == T.experiments.combined_asr_timeout_s
        calls.append("asr")
        if fails:
            raise ApiError(504, "wav2vec2_timeout", "private.wav")
        return PREDICTION

    monkeypatch.setattr(endpoint, "_recognize", recognize)
    monkeypatch.setattr(
        combined,
        "track_faces",
        lambda paths, stamps, model: FaceTrack(
            frames=[FaceFrame(ts, None, None) for ts in stamps], image_size=SIZE
        ),
    )
    caplog.set_level(logging.DEBUG)
    temporary = tmp_path / "temporary"
    response = make_client(debug=True, tmp_dir=temporary).post(
        URL, files=video_file(sample_video), data={"target": "saya tuli"}
    )
    assert response.status_code == 200 and calls == ["extract", "asr"]
    body = response.json()
    assert body["target"] == "saya tuli"
    assert body["feedback"]["outcome"] == (None if fails else "coba_lagi")
    assert list(temporary.iterdir()) == []
    assert SECRET_FILENAME not in caplog.text and str(temporary) not in caplog.text


@pytest.mark.parametrize("kind", ["type", "corrupt", "no_audio", "long", "target", "unexpected"])
def test_input_error_cleanup(
    make_client: Callable[..., TestClient],
    make_clip: Callable[..., Path],
    sample_video: bytes,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    kind: str,
) -> None:
    temporary = tmp_path / "temporary"

    def fail(*args: object, **kwargs: object) -> None:
        raise RuntimeError("private.mp4")

    monkeypatch.setattr(endpoint, "analyze_combined", fail)
    data = (
        make_clip(audio=None).read_bytes()
        if kind == "no_audio"
        else make_clip(duration=4.2).read_bytes()
        if kind == "long"
        else b"\0\0\0\x18ftypmp42garbage"
        if kind == "corrupt"
        else b"RIFF"
        if kind == "type"
        else sample_video
    )
    response = make_client(debug=True, tmp_dir=temporary).post(
        URL,
        files=video_file(
            data,
            "test.wav" if kind == "type" else SECRET_FILENAME,
            "audio/wav" if kind == "type" else "video/mp4",
        ),
        data={"target": "unknown" if kind == "target" else "tolong"},
    )
    assert response.status_code == (415 if kind == "type" else 500 if kind == "unexpected" else 422)
    assert "private" not in response.text
    assert not temporary.exists() or list(temporary.iterdir()) == []


@pytest.mark.parametrize("target", ["pa", "ma"])
def test_endpoint_accepts_syllables_without_prompting_asr(
    make_client: Callable[..., TestClient],
    sample_video: bytes,
    tmp_path: Path,
    moving: None,
    monkeypatch: pytest.MonkeyPatch,
    target: str,
) -> None:
    calls = []

    def recognize(path: Path, timeout_s: float) -> Wav2Vec2Response:
        assert path.is_file() and timeout_s == T.experiments.combined_asr_timeout_s
        calls.append(path)
        return Wav2Vec2Response(transcription=target, inference_ms=1)

    monkeypatch.setattr(endpoint, "_recognize", recognize)
    temporary = tmp_path / "temporary"
    response = make_client(debug=True, tmp_dir=temporary).post(
        URL, files=video_file(sample_video), data={"target": target}
    )
    assert response.status_code == 200
    result = CombinedResponse.model_validate(response.json())
    assert result.target == target and result.asr.transcription == target
    assert result.feedback.outcome == "berhasil"
    assert len(calls) == 1 and list(temporary.iterdir()) == []


def test_upload_closed_and_shared_contract() -> None:
    upload = UploadFile(io.BytesIO(b"bad"), filename="private.wav")
    with pytest.raises(ApiError):
        endpoint.combined(Settings(_env_file=None), T, upload, "tolong")
    assert upload.file.closed
    path = Path(__file__).resolve().parents[2] / "app/test-fixtures/contract/combined.json"
    result = CombinedResponse.model_validate_json(path.read_text(encoding="utf-8"))
    assert result.feedback.outcome == "berhasil" and result.target == "tolong"
