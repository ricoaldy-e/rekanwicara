"""Development-only single-upload observations with three independent components."""

import time
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.schemas import CombinedResponse, CommunicationTarget, ErrorResponse
from app.api.uploads import check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.api.v1.wav2vec2 import _recognize
from app.core.experiment_audio import PocError, validate_wav
from app.pipeline.combined import analyze_combined
from app.pipeline.media import MediaError, MediaToolsMissing, prepared_media

router = APIRouter(prefix=API_PREFIX, tags=["experiments"])


@router.post(
    "/experiments/combined",
    response_model=CombinedResponse,
    responses={code: {"model": ErrorResponse} for code in (413, 415, 422, 503)},
)
def combined(
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    file: Annotated[UploadFile, File()],
    target: Annotated[CommunicationTarget, Form()],
) -> CombinedResponse:
    start = time.perf_counter()
    try:
        check_video_upload(file, settings.max_upload_bytes)
        cfg = thresholds.media
        # A single extra decoded sample detects excessive duration without processing a long upload.
        bounded = cfg.model_copy(
            update={"max_duration_s": cfg.max_duration_s + 1 / cfg.audio_sample_rate_hz}
        )
        with prepared_media(file.file, bounded, tmp_root=settings.tmp_dir) as media:
            if media.wav_path is None:
                raise ApiError(422, "audio_missing", "Video harus memiliki rekaman suara.")
            validate_wav(media.wav_path, cfg)
            media_ms = round((time.perf_counter() - start) * 1000)
            result = analyze_combined(
                media,
                thresholds,
                settings.face_model_path,
                lambda wav: _recognize(wav, thresholds.experiments.combined_asr_timeout_s),
                media_ms,
                target,
            )
        result.processing_ms = round((time.perf_counter() - start) * 1000)
        return result
    except PocError as exc:
        raise ApiError(
            422, exc.code, "Audio tidak sesuai. Coba rekam lagi dalam batas durasi."
        ) from exc
    except MediaToolsMissing as exc:
        raise ApiError(503, exc.code, "FFmpeg/FFprobe belum tersedia di laptop.") from exc
    except MediaError as exc:
        raise ApiError(
            422, exc.code, "Video tidak dapat dibaca atau pemrosesan terlalu lama."
        ) from exc
    except OSError as exc:
        raise ApiError(503, "media_unavailable", "Berkas sementara tidak dapat diproses.") from exc
    finally:
        file.file.close()
