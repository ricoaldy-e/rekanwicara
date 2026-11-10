"""POST /v1/analyze and POST /v1/calibrate (SPEC §5).

MOCK_MODE=true: example responses (A0). Otherwise the real pipeline (A3): features -> quality ->
segmentation -> rules -> hint. Sync endpoints: FastAPI runs them in the threadpool, so ffmpeg and
MediaPipe never block the event loop. The upload is closed (deleted) in ``finally``, also on errors;
the pipeline's own temp dir is removed inside ``extract_clip_features``. Calibration stores numbers
only.
"""

import time
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile

from app.api.deps import CalibrationStoreDep, ContentDep, SettingsDep, ThresholdsDep
from app.api.errors import ApiError
from app.api.extract import extract_or_error
from app.api.mock import build_analyze_mock, build_calibrate_mock
from app.api.schemas import (
    AnalyzeResponse,
    CalibrateResponse,
    CalibrationStep,
    ErrorResponse,
    FormantPoint,
    Indicators,
    Item,
    LipContour,
    Loudness,
    MockVariant,
    QualityFlag,
    UnitResult,
    Visuals,
    VowelAnchors,
)
from app.api.uploads import ID_PATTERN, check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.core.settings import Settings
from app.core.thresholds import Thresholds
from app.pipeline import calibration as calib
from app.pipeline.features import ClipFeatures
from app.pipeline.hints import pick_hint, retry_hint
from app.pipeline.lips import lip_contour
from app.pipeline.rules import ItemScore, score_item, score_of, worst
from app.pipeline.segment import speech_region

router = APIRouter(prefix=API_PREFIX, tags=["analysis"])

_ERRORS: dict[int | str, dict[str, object]] = {
    413: {"model": ErrorResponse},
    415: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}
FACE_FLAGS = ("no_face", "face_off_frame")  # the only checks for the silent rest step


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


# ---------- /analyze ----------


@router.post("/analyze", response_model=AnalyzeResponse, responses=_ERRORS)
def analyze(
    settings: SettingsDep,
    content: ContentDep,
    thresholds: ThresholdsDep,
    store: CalibrationStoreDep,
    file: Annotated[UploadFile, File()],
    user_id: Annotated[str, Form(pattern=ID_PATTERN)],
    item_id: Annotated[str, Form()],
    session_id: Annotated[str, Form(pattern=ID_PATTERN)],
    mock: Annotated[MockVariant, Query()] = "hijau",
) -> AnalyzeResponse:
    start = time.perf_counter()
    try:
        item = content.items_by_id.get(item_id)
        if item is None:
            raise ApiError(422, "invalid_item_id", "Unknown item_id.")
        check_video_upload(file, settings.max_upload_bytes)
        if settings.mock_mode:
            return build_analyze_mock(
                item,
                mock,
                scorer=settings.scorer_mode,
                engine_version=settings.engine_version,
                processing_ms=_ms(start),
            )
        if not item.active:
            raise ApiError(422, "item_inactive", "This item is not scored yet.")
        cal = store.load(user_id)
        feats = extract_or_error(
            file.file,
            settings,
            thresholds,
            calib.lip_rest(cal, thresholds),
            calib.noise_floor(cal),
        )
        response, green_vowel = _analysis(item, feats, cal, thresholds, settings)
        if green_vowel is not None and cal is not None and cal.complete:
            vowel, (f1, f2) = green_vowel  # §6.3: anchors follow the user's green attempts
            keep = thresholds.calibration.anchor_history
            store.update(user_id, lambda c: calib.record_green(c, vowel, f1, f2, keep))
        response.processing_ms = _ms(start)
        return response
    finally:
        file.file.close()


def _analysis(
    item: Item,
    feats: ClipFeatures,
    cal: calib.Calibration | None,
    t: Thresholds,
    settings: Settings,
) -> tuple[AnalyzeResponse, tuple[calib.Vowel, tuple[float, float]] | None]:
    """The §5 response, plus (vowel, F1/F2) when a Level 1 vowel was fully green."""
    flags: list[QualityFlag] = list(feats.quality_flags)  # type: ignore[arg-type]
    extra: list[QualityFlag] = [] if cal is not None and cal.complete else ["uncalibrated"]
    region = speech_region(feats, t.segment, t.audio.time_step_s * 1000)
    if region is None and not flags:  # defensive: quality passed but no speech region was found
        flags = ["too_short"]
    hint = retry_hint(flags)
    common = {
        "item_id": item.item_id,
        "level": item.level,
        "scorer": settings.scorer_mode,
        "engine_version": settings.engine_version,
        "processing_ms": 0,
    }
    if hint is not None or region is None:
        response = AnalyzeResponse(
            status="retry",
            quality_flags=flags + extra,
            overall=None,
            score=None,
            indicators=None,
            units=None,
            hint_id=hint or "retry_short",
            visuals=Visuals(),
            **common,
        )
        return response, None

    anchors = calib.anchors(cal, t)
    result = score_item(item.item_id, item.units, feats.lips, feats.voice, region, anchors, t)
    units = []
    for u in result.units:
        start_ms = max(0, round(u.start_ms))  # a closure can start before the audio does
        units.append(
            UnitResult(
                index=u.index,
                target=u.target,
                start_ms=start_ms,
                end_ms=max(start_ms + 1, round(u.end_ms)),
                bibir=u.bibir,
                suara=u.suara,
                status=u.status,
                reason_code=u.reason_code,
            )
        )
    statuses = result.statuses
    has_lips = item.level != 0
    response = AnalyzeResponse(
        status="ok",
        quality_flags=extra,
        overall=worst(statuses),
        score=score_of(statuses),
        indicators=Indicators(
            bibir=worst([u.bibir for u in units if u.bibir]) if has_lips else None,
            suara=worst([u.suara for u in units]),
        ),
        units=units,
        hint_id=pick_hint(result.units),
        visuals=_visuals(item, feats, result, anchors, t),
        **common,
    )
    only = result.units[0] if len(result.units) == 1 else None
    green_vowel = None
    if only and only.target in calib.VOWELS and only.status == "hijau" and only.formants:
        green_vowel = (only.target, only.formants)  # type: ignore[assignment]
    return response, green_vowel


def _visuals(
    item: Item, feats: ClipFeatures, result: ItemScore, anchors: calib.Anchors, t: Thresholds
) -> Visuals:
    voice = feats.voice
    keep = voice.t_ms >= 0
    loudness = Loudness(
        t_ms=[round(float(x)) for x in voice.t_ms[keep]],
        db=[round(float(x), 1) for x in voice.intensity_db[keep]],
    )
    if item.level == 0:
        return Visuals(loudness=loudness)

    point = result.vowel_point
    last = result.units[-1]
    lips = feats.lips
    middle = (last.start_ms + last.end_ms) / 2
    with_face = [k for k, f in enumerate(feats.frames) if f.has_face]
    contour = None
    if with_face:
        k = min(with_face, key=lambda i: abs(float(lips.t_ms[i]) - middle))
        pts = lip_contour(feats.frames[k], feats.image_size, t.lips)
        if pts is not None:
            contour = LipContour(points=[(round(float(x), 3), round(float(y), 3)) for x, y in pts])
    return Visuals(
        vowel_point=None if point is None else FormantPoint(f1=round(point[0]), f2=round(point[1])),
        vowel_anchors=None
        if point is None
        else VowelAnchors(
            **{v: FormantPoint(f1=round(f1), f2=round(f2)) for v, (f1, f2) in anchors.items()}
        ),
        lip_contour=contour,
        loudness=loudness,
    )


# ---------- /calibrate ----------


@router.post("/calibrate", response_model=CalibrateResponse, responses=_ERRORS)
def calibrate(
    settings: SettingsDep,
    thresholds: ThresholdsDep,
    store: CalibrationStoreDep,
    file: Annotated[UploadFile, File()],
    user_id: Annotated[str, Form(pattern=ID_PATTERN)],
    step: Annotated[CalibrationStep, Form()],
    mock: Annotated[MockVariant, Query()] = "hijau",
) -> CalibrateResponse:
    try:
        check_video_upload(file, settings.max_upload_bytes)
        if settings.mock_mode:
            return build_calibrate_mock(step, mock, engine_version=settings.engine_version)

        cal = store.load(user_id)
        if step == "rest":
            # A silent clip: audio flags (too_quiet, too_short) are expected, only the face counts.
            feats = extract_or_error(file.file, settings, thresholds, calib.raw_rest(thresholds))
            flags = [f for f in feats.quality_flags if f in FACE_FLAGS]
            values = calib.rest_values(feats, thresholds)
        else:
            feats = extract_or_error(
                file.file,
                settings,
                thresholds,
                calib.lip_rest(cal, thresholds),
                calib.noise_floor(cal),
            )
            flags = list(feats.quality_flags)
            values = calib.vowel_values(feats, thresholds)
        if values is None and not flags:
            flags = ["no_face"] if step == "rest" else ["too_short"]

        if flags or values is None:
            return CalibrateResponse(
                status="retry",
                step=step,
                quality_flags=flags,  # type: ignore[arg-type]
                saved=False,
                calibration_complete=cal is not None and cal.complete,
                engine_version=settings.engine_version,
            )

        def save(c: calib.Calibration) -> None:
            if step == "rest":
                c.rest = values  # type: ignore[assignment]
            else:
                vowel = step.removeprefix("vowel_")
                c.vowels[vowel] = values  # type: ignore[index, assignment]
                c.history[vowel] = [(values.f1, values.f2)]  # type: ignore[index, union-attr]

        saved = store.update(user_id, save)
        return CalibrateResponse(
            status="ok",
            step=step,
            quality_flags=[],
            saved=True,
            calibration_complete=saved.complete,
            engine_version=settings.engine_version,
        )
    finally:
        file.file.close()
