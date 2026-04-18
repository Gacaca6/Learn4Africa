"""
Learn4Africa — Auth engine.

Centralises everything auth-related:
- Password hashing (bcrypt via passlib)
- Password policy validation
- JWT access, refresh, and purpose (verify/reset) tokens with `jti`
- Revocation (in-memory blocklist keyed by jti — swap for Redis in prod)
- Google ID token verification (google-auth, clock-skew tolerant)
- FastAPI dependencies: require_auth (strict) + optional_auth (loose)

The strict `require_auth` dependency returns the full Mongo user document
as a dict (already serialized). The loose `optional_auth` returns None
if there is no valid token.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

import bcrypt
import jwt
from fastapi import Header, HTTPException, status

from config import settings
from models.mongo import ensure_indexes, users_collection
from models.user import serialize_user
from utils.time import now_utc

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
# We use the `bcrypt` library directly rather than `passlib`'s wrapper:
# passlib's `CryptContext(schemes=["bcrypt"])` runs a self-test on first use
# that hashes a 112-byte string, which `bcrypt>=4.1` rejects by design —
# leaving the whole auth system broken. Direct bcrypt sidesteps that probe.
#
# bcrypt truncates at 72 bytes. We silently truncate here too so long
# passwords are still accepted (just with the first 72 bytes mattering).
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(plain: str) -> bytes:
    raw = plain.encode("utf-8")
    if len(raw) > _BCRYPT_MAX_BYTES:
        raw = raw[:_BCRYPT_MAX_BYTES]
    return raw


def hash_password(plain: str) -> str:
    """Hash a plaintext password with a fresh bcrypt salt."""
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(plain), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time compare a plaintext password against a bcrypt hash."""
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Password policy
# ---------------------------------------------------------------------------

_HAS_LETTER = re.compile(r"[A-Za-z]")
_HAS_DIGIT = re.compile(r"\d")


def validate_password_policy(password: str) -> None:
    """
    Enforce the project's minimum password policy. Raises ValueError
    with a user-friendly message on failure (Pydantic v2 field_validators
    turn ValueErrors into nice 422 responses automatically).

    Policy:
      - at least 8 characters
      - contains at least one letter
      - contains at least one digit
    """
    if not isinstance(password, str):
        raise ValueError("Password must be a string.")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not _HAS_LETTER.search(password):
        raise ValueError("Password must include at least one letter.")
    if not _HAS_DIGIT.search(password):
        raise ValueError("Password must include at least one number.")


# ---------------------------------------------------------------------------
# JWT — access + refresh + purpose tokens with jti-based revocation
# ---------------------------------------------------------------------------

# In-memory blocklist of revoked jti values. Fine for single-process
# deployments and the hackathon demo. For horizontal scale, swap for a
# Redis SET keyed by jti with TTL == token expiry.
# TODO: Redis-backed blocklist for production.
_revoked_jti: set[str] = set()


def revoke_jti(jti: str) -> None:
    """Mark a token's jti as revoked. Idempotent."""
    if jti:
        _revoked_jti.add(jti)


def is_revoked(jti: str) -> bool:
    return bool(jti) and jti in _revoked_jti


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(
    user_id: str, extra: Optional[dict[str, Any]] = None
) -> str:
    """Create a signed access JWT for a given Mongo user _id (string form)."""
    now = now_utc()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expire_hours),
        "jti": uuid.uuid4().hex,
        "type": "access",
    }
    if extra:
        payload.update(extra)
    return _encode(payload)


def create_refresh_token(user_id: str) -> str:
    """Create a refresh JWT used to mint new access tokens via /auth/refresh."""
    now = now_utc()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_expire_days),
        "jti": uuid.uuid4().hex,
        "type": "refresh",
    }
    return _encode(payload)


def create_purpose_token(
    user_id: str, purpose: str, expires_in: timedelta
) -> str:
    """
    Short-lived single-purpose token (email verification, password reset).

    The `purpose` claim is checked by the consuming endpoint to prevent
    cross-use (e.g. a reset token cannot verify an email).
    """
    now = now_utc()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + expires_in,
        "jti": uuid.uuid4().hex,
        "type": "purpose",
        "purpose": purpose,
    }
    return _encode(payload)


def verify_token(
    token: str, expected_type: Optional[str] = None
) -> dict[str, Any]:
    """
    Decode a JWT and return its payload. Raises HTTPException on failure.

    Pass `expected_type` to enforce one of: "access", "refresh", "purpose".
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    jti = payload.get("jti") or ""
    if is_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked. Please sign in again.",
        )

    if expected_type and payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected a {expected_type} token.",
        )

    return payload


# ---------------------------------------------------------------------------
# Google ID token verification
# ---------------------------------------------------------------------------


def verify_google_id_token(id_token_str: str) -> dict[str, Any]:
    """
    Verify a Google ID token and return the decoded claims.

    Requires `google-auth`. If the library is missing, raise a clear error
    so the caller can surface a helpful message to the frontend.
    """
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="google-auth is not installed on the backend.",
        ) from exc

    client_id = settings.google_client_id
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID is not configured on the backend.",
        )

    try:
        # clock_skew_in_seconds tolerates small differences between the
        # server clock and Google's. Windows dev machines frequently drift
        # a few seconds and would otherwise crash with "Token used too early".
        claims = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=30,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {exc}",
        ) from exc

    if claims.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token issuer did not match.",
        )
    return claims


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


async def _lookup_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    users = users_collection()
    if users is None:
        return None
    await ensure_indexes()

    # Try ObjectId first, fall back to string match.
    doc = None
    try:
        from bson import ObjectId  # type: ignore

        try:
            doc = await users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            doc = None
    except ImportError:
        pass

    if doc is None:
        doc = await users.find_one({"_id": user_id})
    return doc


async def require_auth(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Strict dependency — 401 unless a valid Bearer access token is supplied."""
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token. Please sign in.",
        )
    # We allow tokens without a "type" claim for backward compatibility
    # with any pre-refresh-token sessions. New tokens always have type=access.
    payload = verify_token(token)
    if payload.get("type") and payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expected an access token.",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing a subject.",
        )

    doc = await _lookup_user_by_id(user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for this token.",
        )
    # Attach the jti so /logout can revoke it.
    doc["_current_jti"] = payload.get("jti")
    return doc


async def require_auth_with_token(
    authorization: Optional[str] = Header(default=None),
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Like require_auth but also returns the decoded JWT payload."""
    user = await require_auth(authorization)
    token = _extract_bearer(authorization)
    payload = verify_token(token or "")
    return user, payload


async def optional_auth(
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict[str, Any]]:
    """Loose dependency — returns None if no token / invalid token."""
    token = _extract_bearer(authorization)
    if not token:
        return None
    try:
        payload = verify_token(token)
    except HTTPException:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await _lookup_user_by_id(user_id)


def current_user_public(user: dict[str, Any]) -> dict[str, Any]:
    """Shortcut to get a sanitised view of the authed user."""
    return serialize_user(user)
