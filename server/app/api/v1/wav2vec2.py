"""Development-only video transcription through an isolated local CPU process."""

import json
import os
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.api.deps import SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.experiment_media import experiment_audio
from app.api.schemas import ErrorResponse, Wav2Vec2Response
from app.api.v1.prefix import API_PREFIX
from app.pipeline.media import FFMPEG_TIMEOUT_S

REPO = Path(__file__).resolve().parents[4]
PYTHON = REPO / "ml/wav2vec2/.venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
SCRIPT = REPO / "ml/tools/wav2vec2_poc.py"
router = APIRouter(prefix=API_PREFIX, tags=["experiments"])


def _recognize(wav: Path, timeout_s: float = FFMPEG_TIMEOUT_S) -> Wav2Vec2Response:
    if not PYTHON.is_file() or not SCRIPT.is_file():
        raise ApiError(503, "wav2vec2_unavailable", "Lingkungan Wav2Vec2 belum siap.")
    try:
        result = subprocess.run(
            [str(PYTHON), "-B", str(SCRIPT), "--file", str(wav)],
            capture_output=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ApiError(504, "wav2vec2_timeout", "Proses Wav2Vec2 terlalu lama.") from exc
    except OSError as exc:
        raise ApiError(503, "wav2vec2_unavailable", "Wav2Vec2 tidak dapat dijalankan.") from exc
    if result.returncode != 0:
        try:
            code = json.loads(result.stderr).get("code")
        except (ValueError, AttributeError):
            code = None
        if code in ("audio_too_long", "empty_wav", "invalid_wav", "unsupported_wav"):
            raise ApiError(422, code, "Audio tidak sesuai untuk eksperimen Wav2Vec2.")
        raise ApiError(503, "wav2vec2_unavailable", "Model atau lingkungan Wav2Vec2 belum siap.")
    try:
        return Wav2Vec2Response.model_validate_json(result.stdout)
    except ValueError as exc:
        raise ApiError(
            503, "wav2vec2_invalid_result", "Hasil Wav2Vec2 tidak dapat dibaca."
        ) from exc


@router.post(
    "/experiments/wav2vec2",
    response_model=Wav2Vec2Response,
    responses={code: {"model": ErrorResponse} for code in (413, 415, 422, 503, 504)},
)
def recognize_video(
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    file: Annotated[UploadFile, File()],
) -> Wav2Vec2Response:
    with experiment_audio(file, settings, thresholds.media) as wav:
        return _recognize(wav)
