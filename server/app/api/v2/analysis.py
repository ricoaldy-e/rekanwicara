"""V2 evaluation adapters: reuse real pipelines; never honor MOCK_MODE for v2."""

import time
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import CalibrationStoreDep, ContentDep, SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.extract import extract_or_error
from app.api.schemas import Status, V2AnalyzeResponse, V2Feedback, V2Result, Visuals
from app.api.uploads import ID_PATTERN, check_video_upload
from app.api.v1.analysis import _analysis
from app.api.v1.wav2vec2 import _recognize
from app.api.v2.catalog import Catalogue
from app.api.v2.store import AccountDep
from app.core.experiment_audio import PocError, validate_wav
from app.pipeline import calibration as calib
from app.pipeline.combined import observe_audio, observe_visual
from app.pipeline.face import FaceModelMissing
from app.pipeline.media import MediaError, MediaToolsMissing, prepared_media
from app.pipeline.text_match import normalize_text

router = APIRouter(prefix="/v2", tags=["analysis-v2"])
RESULTS: dict[Status, V2Result] = {
    "hijau": "sesuai",
    "kuning": "mendekati",
    "merah": "belum_sesuai",
}


@router.post("/analyze", response_model=V2AnalyzeResponse)
def analyze(
    account: AccountDep,
    content: ContentDep,
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    calibration_store: CalibrationStoreDep,
    file: Annotated[UploadFile, File()],
    item_id: Annotated[str, Form()],
    session_id: Annotated[str, Form(pattern=ID_PATTERN)],
) -> V2AnalyzeResponse:
    start = time.perf_counter()
    try:
        level, target = Catalogue(account, content).target(item_id)
        check_video_upload(file, settings.max_upload_bytes)
        engine = "mediapipe_parselmouth" if level == 1 else "mediapipe_wav2vec2"

        def response(
            result: V2Result | None,
            code: str,
            message: str,
            flags: list[str],
            lip: V2Result | None = None,
            voice: V2Result | None = None,
            visuals: Visuals | None = None,
        ) -> V2AnalyzeResponse:
            return V2AnalyzeResponse(
                status="retry" if result is None else "evaluated",
                item_id=item_id,
                level=level,
                result=result,
                lip_result=lip,
                voice_result=voice,
                feedback=V2Feedback(code=code, message=message),
                quality_flags=flags,
                visuals=visuals,
                engine=engine,
                processing_ms=round((time.perf_counter() - start) * 1000),
            )

        if level == 1:
            item = content.items_by_id[item_id]
            calibration = calibration_store.load(account.uid)
            feats = extract_or_error(
                file.file,
                settings,
                thresholds,
                calib.lip_rest(calibration, thresholds),
                calib.noise_floor(calibration),
            )
            scored, _ = _analysis(item, feats, calibration, thresholds, settings)
            if scored.status == "retry":
                return response(
                    None,
                    scored.hint_id.upper(),
                    content.hints[scored.hint_id],
                    list(scored.quality_flags),
                )
            if scored.overall is None or scored.indicators is None:
                raise ApiError(503, "AI_UNAVAILABLE", "Hasil evaluasi belum dapat diverifikasi.")
            return response(
                RESULTS[scored.overall],
                scored.hint_id.upper(),
                content.hints[scored.hint_id],
                list(scored.quality_flags),
                RESULTS[scored.indicators.bibir] if scored.indicators.bibir else None,
                RESULTS[scored.indicators.suara],
                scored.visuals,
            )

        cfg = thresholds.media
        bounded = cfg.model_copy(
            update={"max_duration_s": cfg.max_duration_s + 1 / cfg.audio_sample_rate_hz}
        )
        with prepared_media(file.file, bounded, tmp_root=settings.tmp_dir) as media:
            if media.wav_path is None:
                return response(
                    None,
                    "AUDIO_MISSING",
                    "Suara belum terekam. Periksa izin mikrofon, lalu rekam lagi.",
                    ["audio_missing"],
                )
            validate_wav(media.wav_path, cfg)
            activity = observe_audio(media, thresholds)
            if activity.result.warnings:
                return response(
                    None,
                    "RECORD_AGAIN",
                    "Ucapan belum cukup terekam. Coba rekam lagi.",
                    activity.result.warnings,
                )
            visual = observe_visual(media, thresholds, settings.face_model_path, activity)
            if visual.gate != "passed":
                return response(
                    None,
                    "RECORD_AGAIN",
                    "Pastikan wajah dan gerak bibir terlihat jelas, lalu rekam lagi.",
                    visual.warnings,
                )
            asr = _recognize(media.wav_path, thresholds.experiments.combined_asr_timeout_s)
            actual = normalize_text(asr.transcription)
            if not actual:
                return response(
                    None,
                    "RECORD_AGAIN",
                    "Ucapan belum dapat dinilai. Coba rekam lagi.",
                    ["empty_transcription"],
                )
            outcome: V2Result = "sesuai" if actual == normalize_text(target) else "belum_sesuai"
            # Motion is an eligibility gate, not a target-specific lip score. Leave lip_result null.
            return response(
                outcome,
                "MATCHED" if outcome == "sesuai" else "PRONUNCIATION_NOT_MATCHED",
                "Ucapan sesuai target."
                if outcome == "sesuai"
                else "Ucapan belum sesuai target. Coba ulangi perlahan.",
                [],
                voice=outcome,
            )
    except (MediaToolsMissing, FaceModelMissing) as exc:
        raise ApiError(503, "AI_UNAVAILABLE", "Model atau alat pemrosesan belum tersedia.") from exc
    except (MediaError, PocError) as exc:
        raise ApiError(
            422, "INVALID_MEDIA", "Rekaman belum dapat dibaca atau durasinya melewati batas."
        ) from exc
    except ApiError as exc:
        if exc.code.isupper():
            raise
        code = (
            "INFERENCE_TIMEOUT"
            if exc.status_code == 504
            else "AI_UNAVAILABLE"
            if exc.status_code >= 500
            else exc.code.upper()
        )
        raise ApiError(exc.status_code, code, "Evaluasi belum dapat diproses. Coba lagi.") from exc
    except OSError as exc:
        raise ApiError(503, "AI_UNAVAILABLE", "Pemrosesan rekaman belum tersedia.") from exc
    except (ValueError, RuntimeError) as exc:
        raise ApiError(
            503, "AI_UNAVAILABLE", "Hasil pemrosesan model belum dapat digunakan."
        ) from exc
    finally:
        file.file.close()
