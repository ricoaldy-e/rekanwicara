"""GET /v1/model-video/{item_id} (SPEC §5). Always enabled, independent of DATASET_MODE."""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.api.deps import ContentDep, SettingsDep
from app.api.errors import ApiError
from app.api.schemas import ErrorResponse
from app.api.v1.prefix import API_PREFIX
from app.core.storage import model_video_path

router = APIRouter(prefix=API_PREFIX, tags=["content"])


@router.get(
    "/model-video/{item_id}",
    response_class=FileResponse,
    responses={200: {"content": {"video/mp4": {}}}, 404: {"model": ErrorResponse}},
)
def model_video(item_id: str, settings: SettingsDep, content: ContentDep) -> FileResponse:
    # Only known item ids reach the filesystem, so the path cannot be manipulated.
    if item_id not in content.items_by_id:
        raise ApiError(404, "model_video_not_found", "No model video for this item.")
    path = model_video_path(settings.data_dir, item_id)
    if not path.is_file():
        raise ApiError(404, "model_video_not_found", "No model video for this item.")
    return FileResponse(path, media_type="video/mp4")
