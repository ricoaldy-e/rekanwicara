"""POST /v1/analyze and POST /v1/calibrate (SPEC §5).

Phase A0: only MOCK_MODE is implemented. Uploads are never written by these endpoints; the
multipart temp file is closed (and thereby deleted) in ``finally``, also on errors.
"""

import time
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile

from app.api.deps import ContentDep, SettingsDep
from app.api.errors import ApiError
from app.api.mock import build_analyze_mock, build_calibrate_mock
from app.api.schemas import (
    AnalyzeResponse,
    CalibrateResponse,
    CalibrationStep,
    ErrorResponse,
    MockVariant,
)
from app.api.uploads import ID_PATTERN, check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.core.settings import Settings

router = APIRouter(prefix=API_PREFIX, tags=["analysis"])

_ERRORS: dict[int | str, dict[str, object]] = {
    413: {"model": ErrorResponse},
    415: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


def _require_mock(settings: Settings) -> None:
    if not settings.mock_mode:
        raise ApiError(
            503,
            "analysis_unavailable",
            "The analysis pipeline is not available yet; run the server with MOCK_MODE=true.",
        )


@router.post("/analyze", response_model=AnalyzeResponse, responses=_ERRORS)
async def analyze(
    settings: SettingsDep,
    content: ContentDep,
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
        _require_mock(settings)
        return build_analyze_mock(
            item,
            mock,
            scorer=settings.scorer_mode,
            engine_version=settings.engine_version,
            processing_ms=int((time.perf_counter() - start) * 1000),
        )
    finally:
        await file.close()


@router.post("/calibrate", response_model=CalibrateResponse, responses=_ERRORS)
async def calibrate(
    settings: SettingsDep,
    file: Annotated[UploadFile, File()],
    user_id: Annotated[str, Form(pattern=ID_PATTERN)],
    step: Annotated[CalibrationStep, Form()],
    mock: Annotated[MockVariant, Query()] = "hijau",
) -> CalibrateResponse:
    try:
        check_video_upload(file, settings.max_upload_bytes)
        _require_mock(settings)
        return build_calibrate_mock(step, mock, engine_version=settings.engine_version)
    finally:
        await file.close()
