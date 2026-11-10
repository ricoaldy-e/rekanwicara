"""GET/POST /v1/debug/features: inspect the A1 media + quality pipeline on a real recording.

Registered only when DEBUG=true (otherwise the route does not exist: 404). Not part of SPEC §5.
The response holds numbers only; the upload is deleted with the temp dir before responding.
"""

import shutil
from importlib.metadata import PackageNotFoundError, version
from typing import Annotated

import numpy as np
from fastapi import APIRouter, File, Request, UploadFile

from app.api.deps import SettingsDep
from app.api.errors import ApiError
from app.api.schemas import (
    DebugAudioSummary,
    DebugFaceSummary,
    DebugFeaturesResponse,
    DebugLipSeries,
    DebugStatusResponse,
    DebugTimings,
    DebugVoiceSeries,
    ErrorResponse,
)
from app.api.uploads import check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.core.thresholds import Thresholds
from app.pipeline.face import FaceModelMissing
from app.pipeline.features import extract_clip_features
from app.pipeline.media import MediaError, MediaToolsMissing

router = APIRouter(prefix=API_PREFIX, tags=["debug"])

_ERRORS: dict[int | str, dict[str, object]] = {
    413: {"model": ErrorResponse},
    415: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


def _num(values: np.ndarray, digits: int) -> list[float | None]:
    """Rounded floats for JSON; NaN (no face / unvoiced) becomes null."""
    return [None if np.isnan(v) else round(float(v), digits) for v in values]


def _version(package: str) -> str | None:
    try:
        return version(package)
    except PackageNotFoundError:
        return None


@router.get("/debug/features", response_model=DebugStatusResponse)
def debug_status(request: Request, settings: SettingsDep) -> DebugStatusResponse:
    return DebugStatusResponse(
        ffmpeg=shutil.which("ffmpeg") is not None,
        ffprobe=shutil.which("ffprobe") is not None,
        face_model=settings.face_model_path.is_file(),
        thresholds_loaded=isinstance(getattr(request.app.state, "thresholds", None), Thresholds),
        mediapipe_version=_version("mediapipe"),
        parselmouth_version=_version("praat-parselmouth"),
    )


@router.post("/debug/features", response_model=DebugFeaturesResponse, responses=_ERRORS)
def debug_features(
    request: Request,
    settings: SettingsDep,
    file: Annotated[UploadFile, File()],
) -> DebugFeaturesResponse:
    # Sync endpoint: FastAPI runs it in the threadpool; ffmpeg/MediaPipe never block the event loop.
    thresholds: Thresholds = request.app.state.thresholds
    try:
        check_video_upload(file, settings.max_upload_bytes)
        try:
            feats = extract_clip_features(
                file.file, thresholds, settings.face_model_path, tmp_root=settings.tmp_dir
            )
        except FaceModelMissing as exc:
            raise ApiError(
                503, exc.code, "Face model missing: run python scripts/download_models.py"
            ) from exc
        except MediaToolsMissing as exc:
            raise ApiError(503, exc.code, "ffmpeg/ffprobe not found on PATH.") from exc
        except MediaError as exc:
            raise ApiError(422, exc.code, "The upload could not be read as a video.") from exc
    finally:
        file.file.close()

    a, f, lips, voice = feats.audio, feats.face, feats.lips, feats.voice
    return DebugFeaturesResponse(
        quality_flags=feats.quality_flags,  # type: ignore[arg-type]
        info=["noise_floor_uncertain"] if a.noise_floor_uncertain else [],
        n_frames=f.n_frames,
        face_frames=f.face_frames,
        face_frame_pct=round(f.face_frame_ratio * 100, 1),
        av_offset_ms=feats.av_offset_ms,
        audio_duration_ms=a.duration_ms,
        has_audio=a.has_audio,
        audio=DebugAudioSummary(
            peak_db=round(a.peak_db, 1),
            noise_floor_db=round(a.noise_floor_db, 1),
            noise_floor_uncertain=a.noise_floor_uncertain,
            speech_start_ms=a.speech_start_ms,
            speech_ms=a.speech_ms,
            speech_coverage=round(a.speech_coverage, 3),
            speech_median_db=None if a.speech_median_db is None else round(a.speech_median_db, 1),
            loud_region_voiced_ratio=None
            if a.loud_region_voiced_ratio is None
            else round(a.loud_region_voiced_ratio, 3),
            clip_ratio=round(a.clip_ratio, 4),
            too_noisy_evaluated=a.too_noisy_evaluated,
        ),
        face=DebugFaceSummary(
            face_width_ratio=None if f.face_width_ratio is None else round(f.face_width_ratio, 3),
            mouth_out_ratio=None if f.mouth_out_ratio is None else round(f.mouth_out_ratio, 3),
        ),
        lips=DebugLipSeries(
            t_ms=lips.t_ms.tolist(),
            jaw_open=_num(lips.jaw_open, 3),
            lip_gap_ratio=_num(lips.lip_gap_ratio, 3),
            lip_width_ratio=_num(lips.lip_width_ratio, 3),
            rounding=_num(lips.rounding, 3),
            mouth_close=_num(lips.mouth_close, 3),
            closed=lips.closed.tolist(),
        ),
        voice=DebugVoiceSeries(
            t_ms=[round(float(x)) for x in voice.t_ms],
            intensity_db=[round(float(x), 1) for x in voice.intensity_db],
            voiced=voice.voiced.tolist(),
            f0_hz=[round(float(x), 1) for x in voice.f0_hz],
            f1_hz=_num(voice.f1_hz, 0),
            f2_hz=_num(voice.f2_hz, 0),
        ),
        timings_ms=DebugTimings(**vars(feats.timings)),
        engine_version=settings.engine_version,
    )
