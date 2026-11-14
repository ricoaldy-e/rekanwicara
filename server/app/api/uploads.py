"""Upload checks: video only, size limit (SPEC A0: 15 MB)."""

import json
import os

from fastapi import UploadFile
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.errors import ApiError

# Multipart framing + text fields on top of the file itself.
MULTIPART_OVERHEAD_BYTES = 1024 * 1024

# ID-like form fields (user_id, session_id). Also keeps them safe to use in file names later.
ID_PATTERN = r"^[A-Za-z0-9_-]{1,64}$"


def _upload_size(file: UploadFile) -> int:
    if file.size is not None:
        return file.size
    current = file.file.tell()
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(current)
    return size


def check_video_upload(file: UploadFile, max_bytes: int) -> None:
    """Accept only MP4/MOV (ISO base media) videos up to ``max_bytes``.

    Checks both the declared content type and the file's magic bytes (``ftyp`` box).
    """
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("video/"):
        raise ApiError(415, "unsupported_media_type", "Only video uploads (mp4) are accepted.")

    size = _upload_size(file)
    if size == 0:
        raise ApiError(422, "empty_file", "The uploaded file is empty.")
    if size > max_bytes:
        raise ApiError(
            413, "file_too_large", f"The upload exceeds {max_bytes // (1024 * 1024)} MB."
        )

    file.file.seek(0)
    head = file.file.read(12)
    file.file.seek(0)
    if len(head) < 8 or head[4:8] != b"ftyp":
        raise ApiError(415, "unsupported_media_type", "The file is not an mp4 video.")


class UploadSizeLimitMiddleware:
    """Reject oversized requests by Content-Length before the multipart body is spooled to disk."""

    def __init__(self, app: ASGIApp, max_bytes: int, tutorial_max_bytes: int | None = None) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.tutorial_max_bytes = tutorial_max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            max_bytes = self.max_bytes
            if scope.get("path", "").startswith("/v1/tutorials/") and self.tutorial_max_bytes:
                max_bytes = self.tutorial_max_bytes
            for name, value in scope.get("headers", []):
                if name == b"content-length":
                    try:
                        length = int(value)
                    except ValueError:
                        length = 0
                    if length > max_bytes:
                        limit_mb = (max_bytes - MULTIPART_OVERHEAD_BYTES) // (1024 * 1024)
                        body = json.dumps(
                            {
                                "detail": {
                                    "code": "FILE_TOO_LARGE"
                                    if scope.get("path", "").startswith("/v2/")
                                    else "file_too_large",
                                    "message": f"The upload exceeds {limit_mb} MB.",
                                }
                            }
                        ).encode()
                        await send(
                            {
                                "type": "http.response.start",
                                "status": 413,
                                "headers": [
                                    (b"content-type", b"application/json"),
                                    (b"content-length", str(len(body)).encode()),
                                ],
                            }
                        )
                        await send({"type": "http.response.body", "body": body})
                        return
                    break
        await self.app(scope, receive, send)
