"""
Learn4Africa — local JSON fallback for the users collection.

Activates automatically when `MONGODB_URI` is not configured. Implements
the minimal slice of motor's AsyncIOMotorCollection API our auth routes
rely on: `find_one`, `insert_one`, `update_one`, and a no-op
`create_index`.

This exists so the hackathon demo (and anyone running locally for the
first time) gets working sign-in without having to provision a MongoDB
cluster. It is NOT suitable for production — it has no concurrency
guarantees beyond a single-process asyncio lock, no durability beyond
the JSON file on disk, and no indexing.

Storage location: `backend/data/local_users.json` (auto-created).
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

_LOCK = asyncio.Lock()
_DEFAULT_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "local_users.json"
)


def _json_default(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)


def _parse_date(value: Any) -> Any:
    """Best-effort rehydration of ISO strings back into datetimes."""
    if isinstance(value, str) and len(value) >= 10 and value[4] == "-":
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


class _InsertResult:
    def __init__(self, inserted_id: Any) -> None:
        self.inserted_id = inserted_id


class _UpdateResult:
    def __init__(self, matched: int, modified: int) -> None:
        self.matched_count = matched
        self.modified_count = modified


class LocalUsersCollection:
    """
    Tiny async, JSON-file-backed stand-in for a MongoDB collection.

    Not every Mongo feature is supported. The auth/users routes only
    ever call:
      - `find_one({"email": ...})`
      - `find_one({"_id": ...})`
      - `find_one({"$or": [{"email": ...}, {"google_id": ...}]})`
      - `insert_one(doc)`
      - `update_one({"_id": ...}, {"$set": {...}})`
      - `update_one({"_id": ...}, {"$push": {...}, "$set": {...}})`

    so that is exactly what we implement.
    """

    def __init__(self, path: Path = _DEFAULT_PATH) -> None:
        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)

    # ---- persistence ---------------------------------------------------

    def _load_sync(self) -> list[dict]:
        if not self._path.exists():
            return []
        try:
            with self._path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                return []
        except (json.JSONDecodeError, OSError):
            return []

    def _save_sync(self, users: list[dict]) -> None:
        tmp = self._path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(users, f, default=_json_default, indent=2)
        tmp.replace(self._path)

    # ---- query matching ------------------------------------------------

    def _match(self, doc: dict, query: dict) -> bool:
        for key, value in query.items():
            if key == "$or":
                if not any(self._match(doc, sub) for sub in value):
                    return False
                continue
            if doc.get(key) != value:
                return False
        return True

    # ---- public API (async) --------------------------------------------

    async def find_one(self, query: dict) -> Optional[dict]:
        async with _LOCK:
            users = self._load_sync()
            for u in users:
                if self._match(u, query):
                    # Return a shallow copy so callers can't mutate storage.
                    return dict(u)
        return None

    async def insert_one(self, doc: dict) -> _InsertResult:
        async with _LOCK:
            users = self._load_sync()
            if "_id" not in doc or doc["_id"] is None:
                doc["_id"] = str(uuid.uuid4())
            # Duplicate-email guard — the unique index in real Mongo.
            email = doc.get("email")
            if email and any(u.get("email") == email for u in users):
                raise DuplicateKeyError(f"duplicate email: {email}")
            users.append(doc)
            self._save_sync(users)
            return _InsertResult(doc["_id"])

    def _apply_update(self, doc: dict, update: dict) -> None:
        # $set — supports dotted paths (e.g. "tracks_progress.python_web")
        set_ops = update.get("$set") or {}
        for key, value in set_ops.items():
            if "." in key:
                parts = key.split(".")
                cur: Any = doc
                for p in parts[:-1]:
                    if not isinstance(cur.get(p), dict):
                        cur[p] = {}
                    cur = cur[p]
                cur[parts[-1]] = value
            else:
                doc[key] = value

        # $push — append to list field
        push_ops = update.get("$push") or {}
        for key, value in push_ops.items():
            arr = doc.get(key)
            if not isinstance(arr, list):
                arr = []
            arr.append(value)
            doc[key] = arr

    async def update_one(self, query: dict, update: dict) -> _UpdateResult:
        async with _LOCK:
            users = self._load_sync()
            matched = 0
            modified = 0
            for u in users:
                if self._match(u, query):
                    matched += 1
                    self._apply_update(u, update)
                    modified += 1
                    break
            if matched:
                self._save_sync(users)
            return _UpdateResult(matched, modified)

    async def create_index(self, *args: Any, **kwargs: Any) -> None:
        # No-op — the in-memory match loop replaces indexes.
        return None


class DuplicateKeyError(Exception):
    """Raised by LocalUsersCollection.insert_one on duplicate email."""
