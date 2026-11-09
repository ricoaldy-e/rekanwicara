"""POST /v1/dataset/upload (SPEC §5, §10). Registered only when DATASET_MODE=true."""

from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import ContentDep, DatasetStoreDep, SettingsDep
from app.api.errors import ApiError
from app.api.schemas import (
    DatasetUploadResponse,
    ErrorResponse,
    RecordingCondition,
    UploadPurpose,
)
from app.api.uploads import ID_PATTERN, check_video_upload
from app.api.v1.prefix import API_PREFIX
from app.core.storage import INTENDED_ERRORS, SPEAKER_IDS, ClipMeta, UploadTooLarge

router = APIRouter(prefix=API_PREFIX, tags=["dataset"])

# Optional ``device`` for the metadata.csv column (SPEC §10.5). Must start with a letter/digit so
# the value can never be read as a spreadsheet formula when metadata.csv is opened.
_DEVICE_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9 _.\-]{0,39}$"


@router.post(
    "/dataset/upload",
    response_model=DatasetUploadResponse,
    responses={c: {"model": ErrorResponse} for c in (413, 415, 422)},
)
def dataset_upload(
    settings: SettingsDep,
    content: ContentDep,
    store: DatasetStoreDep,
    file: Annotated[UploadFile, File()],
    purpose: Annotated[UploadPurpose, Form()],
    speaker_id: Annotated[str, Form()],
    item_id: Annotated[str, Form()],
    rep: Annotated[int, Form(ge=1, le=99)],
    intended_error: Annotated[str, Form()],
    condition: Annotated[RecordingCondition, Form()],
    session_id: Annotated[str, Form(pattern=ID_PATTERN)],
    device: Annotated[str | None, Form(pattern=_DEVICE_PATTERN)] = None,
) -> DatasetUploadResponse:
    if speaker_id not in SPEAKER_IDS:
        raise ApiError(
            422, "invalid_speaker_id", f"speaker_id must be one of {sorted(SPEAKER_IDS)}."
        )

    if item_id not in content.items_by_id:
        raise ApiError(422, "invalid_item_id", "Unknown item_id.")

    if intended_error not in INTENDED_ERRORS:
        raise ApiError(
            422, "invalid_intended_error", f"intended_error must be one of {list(INTENDED_ERRORS)}."
        )
    required_item = INTENDED_ERRORS[intended_error]
    if required_item is not None and required_item != item_id:
        raise ApiError(
            422,
            "intended_error_item_mismatch",
            f"intended_error '{intended_error}' only applies to item '{required_item}'.",
        )

    check_video_upload(file, settings.max_upload_bytes)

    try:
        if purpose == "model_video":
            clip_id = store.save_model_video(file.file, item_id, settings.max_upload_bytes)
        else:
            meta = ClipMeta(
                speaker_id=speaker_id,
                item_id=item_id,
                rep=rep,
                intended_error=intended_error,
                condition=condition,
                session_id=session_id,
                device=device or "",
            )
            clip_id = store.save_clip(file.file, meta, settings.max_upload_bytes)
    except UploadTooLarge as exc:
        raise ApiError(413, "file_too_large", "The upload exceeds the size limit.") from exc

    return DatasetUploadResponse(clip_id=clip_id)
