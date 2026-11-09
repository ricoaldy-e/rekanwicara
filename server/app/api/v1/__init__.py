from fastapi import APIRouter

from app.api.v1 import analysis, dataset, debug, health, items, model_video


def build_v1_router(dataset_mode: bool, debug_mode: bool = False) -> APIRouter:
    router = APIRouter()
    router.include_router(health.router)
    router.include_router(items.router)
    router.include_router(analysis.router)
    router.include_router(model_video.router)
    if dataset_mode:
        # Not registered at all otherwise: the endpoint simply does not exist (404).
        router.include_router(dataset.router)
    if debug_mode:
        # Development only; absent (404) unless DEBUG=true.
        router.include_router(debug.router)
    return router
