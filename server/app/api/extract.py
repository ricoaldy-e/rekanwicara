"""Run the feature pipeline on an upload and map pipeline failures to API errors (shared by
/analyze, /calibrate and /debug/features)."""

from typing import BinaryIO

from app.api.errors import ApiError
from app.core.settings import Settings
from app.core.thresholds import Thresholds
from app.pipeline.face import FaceModelMissing
from app.pipeline.features import ClipFeatures, extract_clip_features
from app.pipeline.lips import LipRest
from app.pipeline.media import MediaError, MediaToolsMissing


def extract_or_error(
    src: BinaryIO,
    settings: Settings,
    thresholds: Thresholds,
    lip_rest: LipRest | None = None,
    noise_floor_db: float | None = None,
) -> ClipFeatures:
    try:
        return extract_clip_features(
            src,
            thresholds,
            settings.face_model_path,
            tmp_root=settings.tmp_dir,
            lip_rest=lip_rest,
            noise_floor_db=noise_floor_db,
        )
    except FaceModelMissing as exc:
        raise ApiError(
            503, exc.code, "Face model missing: run python scripts/download_models.py"
        ) from exc
    except MediaToolsMissing as exc:
        raise ApiError(503, exc.code, "ffmpeg/ffprobe not found on PATH.") from exc
    except MediaError as exc:
        raise ApiError(422, exc.code, "The upload could not be read as a video.") from exc
