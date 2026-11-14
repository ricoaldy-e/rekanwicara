from fastapi import APIRouter

from app.api.v1 import (
    allosaurus,
    analysis,
    auth,
    combined,
    dataset,
    debug,
    health,
    items,
    model_video,
    tutorials,
    wav2vec2,
)


def build_v1_router(dataset_mode: bool, debug_mode: bool = False) -> APIRouter:
    router = APIRouter()
    router.include_router(health.router)
    router.include_router(auth.router)
    router.include_router(items.router)
    router.include_router(analysis.router)
    router.include_router(model_video.router)
    router.include_router(tutorials.router)
    if dataset_mode:
        # Not registered at all otherwise: the endpoint simply does not exist (404).
        router.include_router(dataset.router)
    if debug_mode:
        # Development only; absent (404) unless DEBUG=true.
        router.include_router(debug.router)
        router.include_router(allosaurus.router)
        router.include_router(wav2vec2.router)
        router.include_router(combined.router)
    return router
