"""
Learn4Africa — User-scoped endpoints.

These routes let the signed-in user read and write their own learning
state: aggregated progress, portfolio, and Mwalimu's long-term memory
(weak/strong areas, learning style, session counters).

Mounted under `/api/v1/users` in main.py.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from utils.time import now_utc

# `bson` ships with pymongo/motor. We import lazily so the rest of the
# app can still start if those optional deps are missing (e.g. during
# early dev before `pip install -r requirements.txt`).
try:
    from bson import ObjectId  # type: ignore
    _BSON_AVAILABLE = True
except ImportError:  # pragma: no cover
    ObjectId = None  # type: ignore
    _BSON_AVAILABLE = False

from engines.auth_engine import require_auth
from models.mongo import users_collection
from models.user import serialize_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request shapes
# ---------------------------------------------------------------------------


class MwalimuRememberRequest(BaseModel):
    learning_style: Optional[str] = None
    add_weak_areas: list[str] = Field(default_factory=list)
    add_strong_areas: list[str] = Field(default_factory=list)
    remove_weak_areas: list[str] = Field(default_factory=list)
    preferred_analogy_style: Optional[str] = None
    add_session_minutes: int = 0
    last_encouraging_message: Optional[str] = None
    last_module_title: Optional[str] = None


def _require_mongo():
    users = users_collection()
    if users is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Users backend requires MongoDB.",
        )
    return users


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/me/progress")
async def my_progress(user: dict[str, Any] = Depends(require_auth)):
    """
    Return everything the frontend needs to hydrate a freshly signed-in
    user: active track, per-track progress, and the portfolio.
    """
    return {
        "active_track_id": user.get("active_track_id"),
        "tracks_progress": user.get("tracks_progress", {}),
        "portfolio_items": user.get("portfolio_items", []),
        "mwalimu_context": user.get("mwalimu_context", {}),
    }


@router.get("/me/portfolio")
async def my_portfolio(user: dict[str, Any] = Depends(require_auth)):
    """Return just the portfolio items of the current user."""
    return {"items": user.get("portfolio_items", [])}


@router.get("/{user_id}/portfolio")
async def public_portfolio(user_id: str):
    """
    Return a public view of another user's portfolio.

    Only exposes non-sensitive fields — name, avatar, portfolio items,
    and active track. Useful for shareable profile URLs like
    `learn4africa.com/u/{id}`.
    """
    users = _require_mongo()

    query: dict[str, Any]
    if _BSON_AVAILABLE:
        try:
            query = {"_id": ObjectId(user_id)}  # type: ignore[misc]
        except Exception:
            query = {"_id": user_id}
    else:
        query = {"_id": user_id}

    doc = await users.find_one(query)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    # Privacy gate: portfolios are OFF by default. We return 404 (not 403)
    # for private profiles so their existence is not leaked to scrapers.
    if not doc.get("portfolio_public", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "avatar_url": doc.get("avatar_url"),
        "country": doc.get("country"),
        "district": doc.get("district"),
        "bio": doc.get("bio"),
        "github_username": doc.get("github_username"),
        "linkedin_url": doc.get("linkedin_url"),
        "active_track_id": doc.get("active_track_id"),
        "portfolio_items": [
            item for item in (doc.get("portfolio_items") or []) if item
        ],
    }


@router.post("/mwalimu/remember")
async def mwalimu_remember(
    req: MwalimuRememberRequest,
    user: dict[str, Any] = Depends(require_auth),
):
    """
    Update Mwalimu's long-term memory about the student.

    Called after tutoring sessions (to track weak/strong areas and
    total minutes learned) and after quizzes (to mark a weak area as
    resolved once the student scores well).
    """
    users = _require_mongo()

    context = dict(user.get("mwalimu_context") or {})
    weak = set(context.get("weak_areas") or [])
    strong = set(context.get("strong_areas") or [])

    weak.update(a.strip() for a in req.add_weak_areas if a and a.strip())
    strong.update(a.strip() for a in req.add_strong_areas if a and a.strip())
    for a in req.remove_weak_areas:
        weak.discard(a.strip())

    if req.learning_style:
        context["learning_style"] = req.learning_style
    if req.preferred_analogy_style:
        context["preferred_analogy_style"] = req.preferred_analogy_style
    if req.last_encouraging_message is not None:
        context["last_encouraging_message"] = req.last_encouraging_message
    if req.last_module_title is not None:
        context["last_module_title"] = req.last_module_title

    context["weak_areas"] = sorted(weak)
    context["strong_areas"] = sorted(strong)
    context["total_sessions"] = int(context.get("total_sessions") or 0) + 1
    context["total_minutes"] = int(context.get("total_minutes") or 0) + max(
        0, int(req.add_session_minutes or 0)
    )

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "mwalimu_context": context,
                "updated_at": now_utc(),
            }
        },
    )
    return {"ok": True, "mwalimu_context": context}
