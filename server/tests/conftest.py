import shutil
import subprocess
from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app

FFMPEG_MISSING = (
    "ffmpeg not found on PATH. Install it and reopen the terminal: "
    "Windows `winget install -e --id Gyan.FFmpeg`, macOS `brew install ffmpeg`, "
    "Linux `sudo apt install ffmpeg`."
)

# A filename that must never show up in logs.
SECRET_FILENAME = "rahasia_wajah_S01.mp4"


@pytest.fixture(scope="session")
def sample_video(tmp_path_factory: pytest.TempPathFactory) -> bytes:
    """2 s test video: testsrc pattern + 220 Hz sine, H.264/AAC in mp4."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.fail(FFMPEG_MISSING)
    out = tmp_path_factory.mktemp("media") / "sample.mp4"
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=15",
        "-f", "lavfi", "-i", "sine=frequency=220:duration=2:sample_rate=44100",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        str(out),
    ]  # fmt: skip
    subprocess.run(cmd, check=True, capture_output=True, timeout=120)
    return out.read_bytes()


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    return tmp_path / "data"


@pytest.fixture
def make_client(data_dir: Path) -> Callable[..., TestClient]:
    def _make(**overrides: object) -> TestClient:
        values: dict[str, object] = {"mock_mode": True, "dataset_mode": False, **overrides}
        settings = Settings(_env_file=None, data_dir=data_dir, **values)  # type: ignore[call-arg]
        return TestClient(create_app(settings))

    return _make


@pytest.fixture
def client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()


def video_file(
    data: bytes, name: str = SECRET_FILENAME, content_type: str = "video/mp4"
) -> dict[str, tuple[str, bytes, str]]:
    return {"file": (name, data, content_type)}


# ---------- Phase A1: media fixtures and the face model ----------

FACE_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "face_landmarker.task"
MODEL_MISSING = (
    "Model face_landmarker.task belum ada: "
    "jalankan python scripts/download_models.py (dari folder server/)"
)

# Audio expressions for ffmpeg's aevalsrc (t in seconds). A 180 Hz tone with harmonics, 0.5-1.5 s.
TONE = "0.3*(sin(2*PI*180*t)+0.5*sin(2*PI*360*t)+0.3*sin(2*PI*540*t))/1.8"
AUDIO_TONE = f"if(between(t,0.5,1.5),{TONE},0)"
AUDIO_SILENT = "0"
# Driven 4x past full scale and hard-limited to +-1: a clipped recording. Encoded LOSSLESS (ALAC):
# after lossy AAC the flat tops ripple, so only ~0.04% of samples stay >= 0.99 (31% >= 0.9). That
# AAC effect on the SPEC §6.2 rule is a tuning question for A6, not something this fixture hides.
AUDIO_CLIPPED = f"if(between(t,0.5,1.5),clip(4*{TONE}/0.3,-1,1),0)"
LOSSLESS_AUDIO = {AUDIO_CLIPPED}


@pytest.fixture(scope="session")
def ffmpeg_bin() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.fail(FFMPEG_MISSING)
    return ffmpeg


@pytest.fixture(scope="session")
def make_clip(ffmpeg_bin: str, tmp_path_factory: pytest.TempPathFactory) -> Callable[..., Path]:
    """Build (and cache) a test mp4: testsrc video (no face) + an aevalsrc audio expression."""
    out_dir = tmp_path_factory.mktemp("clips")
    cache: dict[tuple[object, ...], Path] = {}

    def _make(
        audio: str | None = AUDIO_TONE,
        duration: float = 2.0,
        size: str = "640x360",
        rate: int = 30,
        audio_delay_s: float = 0.0,
    ) -> Path:
        key = (audio, duration, size, rate, audio_delay_s)
        if key in cache:
            return cache[key]
        out = out_dir / f"clip_{len(cache)}.mp4"
        cmd = [
            ffmpeg_bin, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", f"testsrc=duration={duration}:size={size}:rate={rate}",
        ]  # fmt: skip
        if audio is not None:
            if audio_delay_s:
                cmd += ["-itsoffset", str(audio_delay_s)]
            cmd += ["-f", "lavfi", "-i", f"aevalsrc='{audio}':d={duration}:s=44100"]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
        if audio is not None:
            codec = ["-c:a", "alac"] if audio in LOSSLESS_AUDIO else ["-c:a", "aac", "-b:a", "128k"]
            cmd += codec
        cmd.append(str(out))
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)
        cache[key] = out
        return out

    return _make


@pytest.fixture
def face_model() -> Path:
    """The real MediaPipe model; tests using it are marked requires_model and skip without it."""
    if not FACE_MODEL_PATH.is_file():
        pytest.skip(MODEL_MISSING)
    return FACE_MODEL_PATH
