"""
Learn4Africa — structured request logging with per-request IDs.

Every inbound request gets a short UUID attached to `request.state.request_id`
and echoed back as the `X-Request-ID` response header. Every access-log
line is prefixed with that ID so cross-layer debugging is grep-able:

    [req-a1b2c3d4] POST /api/v1/auth/google → 200 (143ms)
"""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

logger = logging.getLogger("learn4africa.access")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique ID to each request and log a structured access line."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or f"req-{uuid.uuid4().hex[:8]}"
        request.state.request_id = request_id

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = int((time.perf_counter() - start) * 1000)
            logger.exception(
                "[%s] %s %s → 500 (%dms) — unhandled",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
            )
            raise

        duration_ms = int((time.perf_counter() - start) * 1000)
        status = response.status_code
        # Info for 2xx/3xx, warning for 4xx, error for 5xx.
        level = logging.INFO
        if 400 <= status < 500:
            level = logging.WARNING
        elif status >= 500:
            level = logging.ERROR
        logger.log(
            level,
            "[%s] %s %s → %d (%dms)",
            request_id,
            request.method,
            request.url.path,
            status,
            duration_ms,
        )

        response.headers["X-Request-ID"] = request_id
        return response
