"""Privacy-safe request logging.

Rule (CLAUDE.md, SPEC §12): logs contain only numbers and status codes. We log the HTTP method,
the route *template* (e.g. ``/v1/model-video/{item_id}``), the status code and the duration in ms.
Never the raw path, query string, client address, filenames, form fields or upload content.
"""

import json
import logging
import time
from typing import Any

from starlette.types import ASGIApp, Message, Receive, Scope, Send

ACCESS_LOGGER_NAME = "cermin_wicara.access"
access_logger = logging.getLogger(ACCESS_LOGGER_NAME)

_INTERNAL_ERROR_BODY = json.dumps(
    {"detail": {"code": "internal_error", "message": "Internal server error."}}
).encode()


def configure_logging(debug: bool) -> None:
    if not access_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        access_logger.addHandler(handler)
    access_logger.setLevel(logging.DEBUG if debug else logging.INFO)
    access_logger.propagate = True
    # Uvicorn's own access log includes the client address and the raw path with query string.
    logging.getLogger("uvicorn.access").disabled = True
    # Outbound Storage URLs and request headers must not reach debug/access logs.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def _route_template(scope: Scope) -> str:
    route: Any = scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) else "<unmatched>"


class AccessLogMiddleware:
    """Pure ASGI middleware: one log line per request; unhandled errors become a generic 500
    so the traceback (which may contain file paths) never reaches the server log."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status = 500
        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                status = message["status"]
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:  # noqa: BLE001 - deliberately generic, see docstring
            status = 500
            access_logger.error("unhandled_error type=%s", type(exc).__name__)
            if not response_started:
                await send(
                    {
                        "type": "http.response.start",
                        "status": 500,
                        "headers": [(b"content-type", b"application/json")],
                    }
                )
                await send({"type": "http.response.body", "body": _INTERNAL_ERROR_BODY})
        finally:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            access_logger.info(
                "%s %s %d %dms",
                scope.get("method", "?"),
                _route_template(scope),
                status,
                elapsed_ms,
            )
