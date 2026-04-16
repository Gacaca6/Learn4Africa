"""
Shared pytest fixtures for Learn4Africa backend tests.

Design notes:
  * Environment variables are set BEFORE any application import, so the
    JWT_SECRET_KEY is stable across test runs and `config.settings` reads
    deterministic values.
  * We stub `models.mongo.users_collection()` with an in-memory async
    collection. The real motor/MongoDB client is never touched during
    tests — this keeps the suite runnable with zero external services
    (the same constraint that drives the local_json fallback in prod).
  * Rate limits are disabled in the test app so a 5/minute cap doesn't
    flake tests that register several accounts in a loop.
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path
from typing import Any, Iterable, Optional

import pytest

# ---------------------------------------------------------------------------
# 1. Environment setup — MUST run before `import main` (via backend imports).
# ---------------------------------------------------------------------------

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-" + uuid.uuid4().hex)
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_EXPIRE_HOURS", "1")
os.environ.setdefault("REFRESH_EXPIRE_DAYS", "1")
os.environ.setdefault("GOOGLE_CLIENT_ID", "")  # force /google 500 unless set
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("MONGO_URI", "")  # force local_json fallback path

# Make the `backend/` directory importable whether pytest is invoked
# from the repo root or from inside backend/.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


# ---------------------------------------------------------------------------
# 2. In-memory async collection that mimics the tiny slice of motor
#    our routes actually use.
# ---------------------------------------------------------------------------


class _FakeInsertResult:
    def __init__(self, inserted_id: Any) -> None:
        self.inserted_id = inserted_id


class _FakeUpdateResult:
    def __init__(self, matched: int, modified: int) -> None:
        self.matched_count = matched
        self.modified_count = modified


def _matches(doc: dict[str, Any], query: dict[str, Any]) -> bool:
    """Mini matcher supporting equality + `$or` (all that the routes use)."""
    for key, value in query.items():
        if key == "$or":
            branches: Iterable[dict[str, Any]] = value
            if not any(_matches(doc, b) for b in branches):
                return False
            continue
        if doc.get(key) != value:
            return False
    return True


class InMemoryUsersCollection:
    """Drop-in replacement for the async motor users collection."""

    def __init__(self) -> None:
        self.docs: list[dict[str, Any]] = []

    def reset(self) -> None:
        self.docs.clear()

    async def find_one(
        self, query: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        for doc in self.docs:
            if _matches(doc, query):
                return dict(doc)  # copy — routes sometimes mutate
        return None

    async def insert_one(self, doc: dict[str, Any]) -> _FakeInsertResult:
        doc = dict(doc)
        # Assign a synthetic ObjectId-like string so the whole stack
        # (which stringifies via str(_id)) stays happy.
        if "_id" not in doc:
            doc["_id"] = uuid.uuid4().hex
        self.docs.append(doc)
        return _FakeInsertResult(doc["_id"])

    async def update_one(
        self, query: dict[str, Any], update: dict[str, Any]
    ) -> _FakeUpdateResult:
        set_fields = (update or {}).get("$set") or {}
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(set_fields)
                return _FakeUpdateResult(1, 1 if set_fields else 0)
        return _FakeUpdateResult(0, 0)

    async def create_index(self, *args: Any, **kwargs: Any) -> str:
        # No-op — indexes are meaningless for an in-memory list.
        return "noop_index"


# ---------------------------------------------------------------------------
# 3. Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def fake_users() -> InMemoryUsersCollection:
    return InMemoryUsersCollection()


@pytest.fixture()
def app(monkeypatch, fake_users):
    """
    Return a FastAPI app wired to:
      * an in-memory users collection
      * a no-op `ensure_indexes`
      * slowapi limits disabled

    We import `main` lazily inside the fixture so env overrides above
    are picked up before any module-level settings.load happens.
    """
    # IMPORTANT: import main FIRST. routes/auth.py wraps each endpoint in a
    # `_rate_limit` decorator that does `from main import limiter` at call
    # time. If we import `routes.auth` here before `main`, that decorator
    # triggers a circular import that corrupts main.app (auth routes end up
    # missing from the app). Importing `main` first means every route-level
    # import happens in the correct order; we then grab handles to the
    # already-loaded submodules for monkeypatching.
    import main as main_module  # noqa: PLC0415 — ordering matters
    import models.mongo as mongo_module
    import engines.auth_engine as auth_engine
    import routes.auth as auth_routes
    import routes.users as users_routes

    async def _noop_ensure_indexes() -> None:
        return None

    def _get_fake_users():
        return fake_users

    # `routes/auth.py` and friends did `from models.mongo import users_collection`
    # at import time — so each module holds its OWN bound reference to the
    # original function. Patching only `mongo_module` leaves those stale.
    # Patch every call site.
    for mod in (mongo_module, auth_routes, users_routes, auth_engine):
        monkeypatch.setattr(
            mod, "users_collection", _get_fake_users, raising=False
        )
        monkeypatch.setattr(
            mod, "ensure_indexes", _noop_ensure_indexes, raising=False
        )

    # Reset the in-memory JWT revocation blocklist between tests so one
    # test's /logout doesn't 401 the next test's user.
    auth_engine._revoked_jti.clear()

    # Disable slowapi caps for tests — otherwise a loop of registrations
    # would hit 3/minute and fail with 429.
    main_module.limiter.enabled = False

    try:
        yield main_module.app
    finally:
        main_module.limiter.enabled = True


@pytest.fixture()
def client(app):
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c
