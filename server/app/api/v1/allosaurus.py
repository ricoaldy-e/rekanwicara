"""Development-only video -> temporary WAV -> isolated Allosaurus CLI."""

import json
import os
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.api.deps import SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.experiment_media import experiment_audio
from app.api.schemas import AllosaurusResponse, ErrorResponse
from app.api.v1.prefix import API_PREFIX
from app.pipeline.media import FFMPEG_TIMEOUT_S

REPO = Path(__file__).resolve().parents[4]
PYTHON = REPO / "ml" / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
SCRIPT = REPO / "ml" / "tools" / "allosaurus_poc.py"
router = APIRouter(prefix=API_PREFIX, tags=["experiments"])


def _recognize(wav: Path) -> AllosaurusResponse:
    if not PYTHON.is_file() or not SCRIPT.is_file():
        raise ApiError(503, "allosaurus_unavailable", "Lingkungan Allosaurus belum siap.")
    try:
        result = subprocess.run(
            [str(PYTHON), str(SCRIPT), "--file", str(wav)],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT_S,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ApiError(504, "allosaurus_timeout", "Proses Allosaurus terlalu lama.") from exc
    except OSError as exc:
        raise ApiError(503, "allosaurus_unavailable", "Allosaurus tidak dapat dijalankan.") from exc
    if result.returncode != 0:
        try:
            code = json.loads(result.stderr).get("code")
        except (ValueError, AttributeError):
            code = None
        if code in ("audio_too_long", "empty_wav", "invalid_wav", "unsupported_wav"):
            raise ApiError(422, code, "Audio tidak sesuai untuk eksperimen Allosaurus.")
        raise ApiError(
            503, "allosaurus_unavailable", "Model atau lingkungan Allosaurus belum siap."
        )
    try:
        return AllosaurusResponse.model_validate_json(result.stdout)
    except ValueError as exc:
        raise ApiError(
            503, "allosaurus_invalid_result", "Hasil Allosaurus tidak dapat dibaca."
        ) from exc


@router.post(
    "/experiments/allosaurus",
    response_model=AllosaurusResponse,
    responses={code: {"model": ErrorResponse} for code in (413, 415, 422, 503, 504)},
)
def recognize_video(
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    file: Annotated[UploadFile, File()],
) -> AllosaurusResponse:
    with experiment_audio(file, settings, thresholds.media) as wav:
        return _recognize(wav)
