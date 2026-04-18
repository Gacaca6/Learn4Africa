"""
Learn4Africa — MongoDB connection + collection accessors.

Used for user accounts, track progress, portfolio items, and
Mwalimu's long-term memory about each learner.

The existing SQLAlchemy module in database.py stays for course content;
MongoDB owns user-generated state (which scales horizontally better
and matches the flexible shape of progress/portfolio data).
"""

from __future__ import annotations

from typing import Any, Optional

from config import settings

# Motor = async MongoDB driver. We fall back to in-memory stub if motor
# cannot connect (e.g. offline dev) — this keeps the rest of the app
# runnable while auth is being tested locally.

try:
    from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
    _MOTOR_AVAILABLE = True
except ImportError:  # pragma: no cover
    _MOTOR_AVAILABLE = False
    AsyncIOMotorClient = None  # type: ignore
    AsyncIOMotorDatabase = None  # type: ignore


_client: Optional["AsyncIOMotorClient"] = None
_db: Optional["AsyncIOMotorDatabase"] = None
_indexes_created = False

# Fallback local JSON store, used when MONGODB_URI is blank / unreachable.
# Lazily instantiated so the import of this module stays cheap.
_local_users = None
_using_local_store = False

# Tri-state: None = not yet probed, True = ping succeeded, False = ping failed
# (in which case we permanently fall back to the local JSON store for this
# process so requests don't stall waiting on an unreachable cluster).
_mongo_alive: Optional[bool] = None
_mongo_probe_error: Optional[str] = None


def get_client() -> Optional["AsyncIOMotorClient"]:
    """Return a cached AsyncIOMotorClient (lazy init)."""
    global _client
    if not _MOTOR_AVAILABLE:
        return None
    if _client is None:
        uri = settings.mongodb_uri
        if not uri:
            return None

        # Force motor/pymongo to use certifi's bundled CA certificates.
        # On Windows + Python 3.13 the default SSL context sometimes fails
        # the Atlas TLS handshake with `TLSV1_ALERT_INTERNAL_ERROR` because
        # the system trust store is missing an intermediate CA. Pointing
        # tlsCAFile at certifi's cacert.pem fixes this.
        tls_ca_file = None
        try:
            import certifi  # type: ignore

            tls_ca_file = certifi.where()
        except ImportError:
            tls_ca_file = None

        client_kwargs: dict[str, Any] = {
            "serverSelectionTimeoutMS": 10000,
            "connectTimeoutMS": 20000,
            "socketTimeoutMS": 20000,
            "retryWrites": True,
        }
        if tls_ca_file:
            client_kwargs["tlsCAFile"] = tls_ca_file

        _client = AsyncIOMotorClient(uri, **client_kwargs)
    return _client


def get_db() -> Optional["AsyncIOMotorDatabase"]:
    """Return the Learn4Africa database handle (lazy init)."""
    global _db
    if _db is not None:
        return _db
    client = get_client()
    if client is None:
        return None
    _db = client[settings.mongodb_db_name]
    return _db


def _get_local_users():
    """Return (creating if needed) the local JSON fallback collection."""
    global _local_users
    if _local_users is None:
        from .local_store import LocalUsersCollection

        _local_users = LocalUsersCollection()
    return _local_users


async def probe_mongo() -> bool:
    """
    Ping the Mongo cluster once and cache the result.

    If the ping fails, we permanently fall back to the local JSON store
    for this process — this prevents every subsequent request from
    stalling 10s waiting on an unreachable cluster.

    Safe to call repeatedly: the probe is cached.
    """
    global _mongo_alive, _mongo_probe_error, _using_local_store

    if _mongo_alive is not None:
        return _mongo_alive

    if not _MOTOR_AVAILABLE:
        _mongo_alive = False
        _mongo_probe_error = "motor not installed"
        _using_local_store = True
        return False

    client = get_client()
    if client is None:
        _mongo_alive = False
        _mongo_probe_error = "MONGODB_URI not set"
        _using_local_store = True
        return False

    try:
        await client.admin.command("ping")
        _mongo_alive = True
        _mongo_probe_error = None
        _using_local_store = False
        print("[mongo] Connected to Atlas — using MongoDB as users backend.", flush=True)
        return True
    except Exception as exc:  # noqa: BLE001
        _mongo_alive = False
        _mongo_probe_error = str(exc)
        _using_local_store = True
        print(
            "[mongo] Atlas unreachable — falling back to local JSON store.\n"
            f"        Reason: {type(exc).__name__}: {str(exc)[:200]}",
            flush=True,
        )
        return False


def users_collection():
    """
    Return the users collection.

    Preference order:
      1. Real MongoDB via motor, if `MONGODB_URI` is set AND the last
         probe succeeded (see `probe_mongo`).
      2. A local JSON-file-backed fallback (for dev / hackathon demos).

    The probe runs once per process via `ensure_indexes()`. Until the
    probe has run, we optimistically try Mongo if a URI is configured;
    once the probe fails, we stick with the local store for the rest of
    the process lifetime so requests don't stall on an unreachable cluster.
    """
    global _using_local_store

    # If we've already probed and Mongo is dead, use the local store.
    if _mongo_alive is False:
        _using_local_store = True
        return _get_local_users()

    db = get_db()
    if db is not None:
        # Mongo is either alive (probe succeeded) or not-yet-probed.
        # Either way, return the motor collection.
        _using_local_store = False
        return db["users"]

    # No URI configured at all — straight to local.
    _using_local_store = True
    return _get_local_users()


def is_using_local_store() -> bool:
    """True if the users collection is currently backed by the JSON fallback."""
    return _using_local_store


async def ensure_indexes() -> None:
    """Probe Mongo (once) and create indexes on first use. Idempotent."""
    global _indexes_created

    # Probe first so users_collection() below returns the right backend.
    await probe_mongo()

    if _indexes_created:
        return
    users = users_collection()
    if users is None:
        return
    try:
        await users.create_index("email", unique=True)
        await users.create_index("google_id", sparse=True)
        _indexes_created = True
    except Exception:
        # Indexes are best-effort — do not crash the app if they fail
        pass


async def healthcheck() -> dict[str, Any]:
    """Return a small dict summarising the users-store reachability."""
    if not _MOTOR_AVAILABLE:
        return {"available": True, "backend": "local_json", "reason": "motor not installed"}

    # Use the cached probe result if available.
    alive = await probe_mongo()
    if alive:
        return {"available": True, "backend": "mongodb", "db": settings.mongodb_db_name}
    return {
        "available": True,
        "backend": "local_json",
        "reason": _mongo_probe_error or "probe failed",
    }
