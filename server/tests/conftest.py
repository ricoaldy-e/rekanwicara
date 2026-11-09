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
