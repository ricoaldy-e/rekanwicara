from fastapi import APIRouter

from app.api.deps import SettingsDep
from app.api.schemas import HealthResponse
from app.api.v1.prefix import API_PREFIX

router = APIRouter(prefix=API_PREFIX, tags=["meta"])


@router.get("/health", response_model=HealthResponse)
async def health(settings: SettingsDep) -> HealthResponse:
    return HealthResponse(
        engine_version=settings.engine_version,
        scorer_mode=settings.scorer_mode,
        mock_mode=settings.mock_mode,
    )
