"""
Learn4Africa — Backend API

Free AI-Powered Learning Platform for Africa.

Startup wiring, in order:
  1. Logging (structured, UTC timestamps)
  2. FastAPI app + lifespan (prints banner, ensures media dirs)
  3. slowapi rate limiter (attached via app.state.limiter)
  4. RequestIDMiddleware (tag every request with a UUID)
  5. CORS (origins read from settings, never "*")
  6. Static /media mount
  7. API routers
  8. Root + /health + /status + /version
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from __version__ import __build__, __commit__, __version__
from config import settings
from middleware import RequestIDMiddleware
from models.mongo import healthcheck as mongo_healthcheck
from routes import (
    auth,
    comics,
    courses,
    curriculum,
    flashcards,
    gamification,
    podcasts,
    quizzes,
    songs,
    tracks,
    tutor,
    users,
)

# ── Logging ──────────────────────────────────────────────────────────────────
# Configure once at import time; uvicorn's own logger stacks on top without
# duplication because our logger name is namespaced.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("learn4africa")


# ── Rate limiter ─────────────────────────────────────────────────────────────
# Keyed by client IP. Per-route limits are declared via `@limiter.limit(...)`
# decorators in the route modules. Exceeded requests get a 429 via the
# registered exception handler.
limiter = Limiter(key_func=get_remote_address)


# ── App start time (for /status uptime) ─────────────────────────────────────
_STARTED_AT = time.time()


# ── Media directories — ensure they exist so StaticFiles() doesn't crash ─────
def _ensure_media_dirs() -> None:
    base = Path(__file__).resolve().parent / "media"
    for sub in ("podcasts", "comics", "songs"):
        (base / sub).mkdir(parents=True, exist_ok=True)


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_media_dirs()
    logger.info("=" * 60)
    logger.info("  Learn4Africa API v%s (%s) starting", __version__, __build__)
    logger.info("  AI Provider:  %s", settings.ai_provider)
    logger.info("  TTS Provider: %s", settings.tts_provider)
    logger.info("  CORS Origins: %s", settings.cors_origins)
    logger.info("=" * 60)
    yield
    logger.info("Learn4Africa API shutting down")


# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Learn4Africa API",
    description="Free AI-Powered Learning Platform for Africa — every child deserves knowledge",
    version=__version__,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Middleware (innermost last: request-id → CORS → app) ─────────────────────
app.add_middleware(RequestIDMiddleware)


def _parse_origins(raw: str) -> list[str]:
    """
    Turn the comma-separated `CORS_ORIGINS` env into a list. Reject "*"
    explicitly — wildcard origins are incompatible with `allow_credentials=True`
    per the Fetch spec, and we do want to keep credentials support for
    cookie-based auth in future.
    """
    origins = [o.strip() for o in (raw or "").split(",") if o.strip()]
    origins = [o for o in origins if o != "*"]
    return origins or ["http://localhost:3000"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ── Static media ─────────────────────────────────────────────────────────────
_ensure_media_dirs()  # also runs at import time for test clients
app.mount("/media", StaticFiles(directory="media"), name="media")


# ── API Routes ───────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["Courses"])
app.include_router(tutor.router, prefix="/api/v1/tutor", tags=["AI Tutor"])
app.include_router(flashcards.router, prefix="/api/v1/flashcards", tags=["Flashcards"])
app.include_router(quizzes.router, prefix="/api/v1/quizzes", tags=["Quizzes"])
app.include_router(podcasts.router, prefix="/api/v1/podcasts", tags=["Podcasts"])
app.include_router(comics.router, prefix="/api/v1/comics", tags=["Comics"])
app.include_router(gamification.router, prefix="/api/v1/gamification", tags=["Gamification"])
app.include_router(songs.router, prefix="/api/v1/songs", tags=["Songs"])
app.include_router(curriculum.router, prefix="/api/v1/curriculum", tags=["Curriculum"])
app.include_router(tracks.router, prefix="/api/v1/tracks", tags=["Career Tracks"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])


# ── Root / meta endpoints ────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "name": "Learn4Africa API",
        "message": "Knowledge is free. Welcome home.",
        "version": __version__,
        "docs": "/docs",
    }


@app.get("/version")
async def version():
    """Lightweight build identity — safe to hit without auth, no DB calls."""
    return {
        "name": "Learn4Africa",
        "version": __version__,
        "build": __build__,
        "commit": __commit__,
    }


@app.get("/health")
async def health():
    """Quick liveness probe — does NOT make network calls."""
    return {
        "status": "healthy",
        "ai_provider": settings.ai_provider,
        "tts_provider": settings.tts_provider,
    }


@app.get("/status")
async def status() -> dict[str, Any]:
    """
    Rich readiness probe — summarises every external dependency.

    Safe to expose publicly: no secrets, no user data. The frontend
    DemoModeBanner reads this endpoint to decide whether to show the
    "running in local demo mode" pill.
    """
    mongo = await mongo_healthcheck()

    # Ollama reachability — best effort, never raise.
    ollama: dict[str, Any] = {"available": False, "url": settings.ollama_base_url}
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama["available"] = r.status_code == 200
    except Exception as exc:  # noqa: BLE001
        ollama["reason"] = f"{type(exc).__name__}"

    return {
        "name": "Learn4Africa",
        "version": __version__,
        "build": __build__,
        "commit": __commit__,
        "uptime_seconds": int(time.time() - _STARTED_AT),
        "ai_provider": settings.ai_provider,
        "tts_provider": settings.tts_provider,
        "mongo": mongo,
        "ollama": ollama,
    }
