"""
Learn4Africa — User model + helpers.

We use Pydantic for validation and dict-based storage for MongoDB.
Every read from Mongo goes through `serialize_user()` to strip the
password hash and convert ObjectId to string.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field

from utils.time import now_utc


# ---------------------------------------------------------------------------
# Nested shapes
# ---------------------------------------------------------------------------


class TrackProgressDoc(BaseModel):
    track_id: str
    started_at: datetime
    last_active: datetime
    current_module: int = 1
    completed_modules: list[int] = Field(default_factory=list)
    quiz_scores: dict[str, int] = Field(default_factory=dict)  # module_number (str) -> score
    practice_completed: list[int] = Field(default_factory=list)
    interview_practiced: list[int] = Field(default_factory=list)
    completion_percentage: float = 0.0
    completed_at: Optional[datetime] = None


class PortfolioItemDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    track_id: str
    module_number: int
    project_name: str
    description: str = ""
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    tech_stack: list[str] = Field(default_factory=list)
    completed_at: datetime = Field(default_factory=now_utc)
    is_featured: bool = False


class MwalimuContextDoc(BaseModel):
    learning_style: Optional[str] = None
    weak_areas: list[str] = Field(default_factory=list)
    strong_areas: list[str] = Field(default_factory=list)
    preferred_analogy_style: str = "everyday"
    total_sessions: int = 0
    total_minutes: int = 0
    last_encouraging_message: Optional[str] = None
    last_module_title: Optional[str] = None


# ---------------------------------------------------------------------------
# Full user shape (input/validation only — storage uses dicts)
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    country: str = "Rwanda"
    district: Optional[str] = None
    preferred_language: str = "en"


class UserPublic(BaseModel):
    """Sanitised user payload safe to return to clients."""

    id: str
    name: str
    email: str
    email_verified: bool = False
    avatar_url: Optional[str] = None
    auth_provider: str = "email"
    country: str = "Rwanda"
    district: Optional[str] = None
    preferred_language: str = "en"
    phone: Optional[str] = None
    bio: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    active_track_id: Optional[str] = None
    tracks_progress: dict[str, Any] = Field(default_factory=dict)
    portfolio_items: list[dict[str, Any]] = Field(default_factory=list)
    mwalimu_context: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


def new_user_document(
    *,
    name: str,
    email: str,
    auth_provider: str,
    password_hash: Optional[str] = None,
    google_id: Optional[str] = None,
    avatar_url: Optional[str] = None,
    email_verified: bool = False,
    country: str = "Rwanda",
    district: Optional[str] = None,
    preferred_language: str = "en",
) -> dict[str, Any]:
    """Return a fresh user document ready to insert into Mongo."""
    now = now_utc()
    return {
        # Identity
        "name": name,
        "email": email.lower().strip(),
        "email_verified": email_verified,
        "avatar_url": avatar_url,
        # Auth
        "auth_provider": auth_provider,  # "google" | "email"
        "password_hash": password_hash,
        "google_id": google_id,
        # Profile
        "country": country,
        "district": district,
        "preferred_language": preferred_language,
        "phone": None,
        "bio": None,
        "github_username": None,
        "linkedin_url": None,
        # Privacy — off by default so a public profile URL stays private
        # until the student explicitly flips the switch in Settings.
        "portfolio_public": False,
        # Learning state
        "active_track_id": None,
        "tracks_progress": {},
        # Portfolio
        "portfolio_items": [],
        # Mwalimu long-term memory
        "mwalimu_context": MwalimuContextDoc().model_dump(),
        # Community
        "cohort_id": None,
        # Meta
        "created_at": now,
        "updated_at": now,
        "last_login": now,
        "is_active": True,
    }


def serialize_user(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw Mongo document into a safe JSON-ready dict."""
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "email_verified": doc.get("email_verified", False),
        "avatar_url": doc.get("avatar_url"),
        "auth_provider": doc.get("auth_provider", "email"),
        "country": doc.get("country", "Rwanda"),
        "district": doc.get("district"),
        "preferred_language": doc.get("preferred_language", "en"),
        "phone": doc.get("phone"),
        "bio": doc.get("bio"),
        "github_username": doc.get("github_username"),
        "linkedin_url": doc.get("linkedin_url"),
        "portfolio_public": bool(doc.get("portfolio_public", False)),
        "active_track_id": doc.get("active_track_id"),
        "tracks_progress": doc.get("tracks_progress", {}),
        "portfolio_items": doc.get("portfolio_items", []),
        "mwalimu_context": doc.get("mwalimu_context", {}),
        "created_at": doc.get("created_at"),
        "last_login": doc.get("last_login"),
    }


def public_user(doc: dict[str, Any]) -> dict[str, Any]:
    """Minimal payload returned with a JWT after login/register."""
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "avatar_url": doc.get("avatar_url"),
        "auth_provider": doc.get("auth_provider", "email"),
        "preferred_language": doc.get("preferred_language", "en"),
        "active_track_id": doc.get("active_track_id"),
    }
