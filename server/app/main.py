"""Cermin Wicara API entry point.

Run: ``uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`` from ``server/``.
"""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.uploads import MULTIPART_OVERHEAD_BYTES, UploadSizeLimitMiddleware
from app.api.v1 import build_v1_router
from app.content.loader import load_content
from app.core.logging import AccessLogMiddleware, configure_logging
from app.core.settings import Settings, get_settings
from app.core.storage import DatasetStore

SUPPORTED_PYTHON = ((3, 10), (3, 11))
_startup_logger = logging.getLogger("cermin_wicara.startup")


def python_version_warning(version: tuple[int, int] | None = None) -> str | None:
    """Warning text if Python is not 3.10/3.11 (MediaPipe/torch need those), else None."""
    major_minor = version or (sys.version_info.major, sys.version_info.minor)
    if major_minor in SUPPORTED_PYTHON:
        return None
    return (
        f"PERINGATAN: server berjalan di Python {major_minor[0]}.{major_minor[1]}, "
        "padahal yang didukung hanya Python 3.10 atau 3.11 (disarankan 3.11). "
        "MediaPipe/torch di fase berikutnya bisa gagal dipasang atau dijalankan. "
        'Buat ulang venv: "py -3.11 -m venv .venv" (Windows) atau "python3.11 -m venv .venv".'
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.debug)
    if (warning := python_version_warning()) is not None:
        _startup_logger.warning(warning)
    content = load_content()  # raises ContentError on invalid content: fail fast at startup

    # debug=False always: FastAPI's debug mode would put tracebacks in responses.
    app = FastAPI(title="Cermin Wicara API", version=settings.engine_version, debug=False)
    app.state.settings = settings
    app.state.content = content
    app.state.dataset_store = DatasetStore(settings.data_dir)

    register_error_handlers(app)
    app.include_router(build_v1_router(settings.dataset_mode))

    # Middleware added last runs first: AccessLog -> CORS -> size limit -> app.
    app.add_middleware(
        UploadSizeLimitMiddleware, max_bytes=settings.max_upload_bytes + MULTIPART_OVERHEAD_BYTES
    )
    # Open CORS: demo runs on a LAN; the native app does not need it, browsers/tools do.
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
    )
    app.add_middleware(AccessLogMiddleware)
    return app


app = create_app()
