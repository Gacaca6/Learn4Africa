"""
Learn4Africa — Authentication routes.

Endpoints (all mounted under `/api/v1/auth` in main.py):
    POST   /register                create an email+password user
    POST   /login                   exchange email+password for access + refresh JWTs
    POST   /google                  exchange a Google ID token for access + refresh JWTs
    POST   /refresh                 swap a refresh token for a new access token
    POST   /logout                  revoke the current access token's jti
    POST   /verify-email/request    issue a short-lived email verification token
    POST   /verify-email/confirm    consume a verification token and flip email_verified
    POST   /forgot-password         issue a short-lived reset token (always 200)
    POST   /reset-password          consume a reset token and set a new password
    GET    /me                      return the current signed-in user
    PATCH  /profile                 update profile fields (name, country, portfolio_public, etc.)

Design notes:
- Rate limits are declared via slowapi. The `request: Request` parameter is
  REQUIRED on every decorated endpoint — slowapi looks it up by name.
- Password policy is enforced in two places: a pydantic `field_validator` on
  registration (422 response with a helpful message), and the same helper is
  re-used by `/reset-password`.
- Refresh tokens live 30 days. Access tokens live 7 days (configurable).
  Logout revokes the *access* token's jti; refresh tokens auto-expire.
- Verify-email and password-reset are implemented as JWTs with
  `type=purpose` and a `purpose` claim so neither can be cross-used.
- In a real deployment the verify/reset tokens would be emailed. For the
  hackathon we return the token in the response (marked `dev_only_token`)
  so the demo can complete without an SMTP server. Remove that field for
  production and wire up sendgrid/mailgun/etc.
- MongoDB owns user state. If Mongo is unavailable the endpoints return a
  clear 503 so the frontend can display "auth backend is offline".
"""

from __future__ import annotations

import logging
import traceback
from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator

logger = logging.getLogger("learn4africa.auth")

from engines.auth_engine import (
    create_access_token,
    create_purpose_token,
    create_refresh_token,
    hash_password,
    require_auth,
    require_auth_with_token,
    revoke_jti,
    validate_password_policy,
    verify_google_id_token,
    verify_password,
    verify_token,
)
from models.mongo import ensure_indexes, users_collection
from models.user import new_user_document, public_user, serialize_user
from utils.time import now_utc

router = APIRouter()


# ---------------------------------------------------------------------------
# Rate-limiter shim
# ---------------------------------------------------------------------------
# main.py owns the `Limiter` instance. Importing it directly from main would
# create a circular import (main imports this module). Resolve lazily at call
# time, and fall back to a no-op decorator if the limiter is absent — that
# way unit tests can instantiate the router without needing the whole app.

def _rate_limit(limit: str):
    def decorator(func):
        try:
            from main import limiter  # type: ignore  # late import on purpose
            return limiter.limit(limit)(func)
        except Exception:
            return func
    return decorator


# ---------------------------------------------------------------------------
# Request / response shapes
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    country: str = "Rwanda"
    district: Optional[str] = None
    preferred_language: str = "en"

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        validate_password_policy(v)
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        validate_password_policy(v)
        return v


class ProfilePatch(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    district: Optional[str] = None
    preferred_language: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    active_track_id: Optional[str] = None
    portfolio_public: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_users_collection():
    users = users_collection()
    if users is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth backend is offline (MongoDB not configured).",
        )
    return users


async def _touch_last_login(user_id: Any) -> None:
    users = users_collection()
    if users is None:
        return
    try:
        await users.update_one(
            {"_id": user_id},
            {"$set": {"last_login": now_utc()}},
        )
    except Exception:
        pass


async def _find_user_by_any_id(user_id: str):
    users = users_collection()
    if users is None:
        return None
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


def _issue_tokens(user_id: str) -> tuple[str, str]:
    """Return a freshly minted (access, refresh) pair for a user id."""
    return create_access_token(user_id), create_refresh_token(user_id)


# ---------------------------------------------------------------------------
# Endpoints — registration / sign-in
# ---------------------------------------------------------------------------


@router.post("/register", response_model=TokenResponse)
@_rate_limit("3/minute")
async def register(request: Request, req: RegisterRequest):
    """Create a new email+password user and return access + refresh JWTs."""
    users = _require_users_collection()
    await ensure_indexes()

    email_norm = req.email.lower().strip()
    existing = await users.find_one({"email": email_norm})
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try signing in.",
        )

    doc = new_user_document(
        name=req.name.strip(),
        email=email_norm,
        auth_provider="email",
        password_hash=hash_password(req.password),
        country=req.country,
        district=req.district,
        preferred_language=req.preferred_language,
        email_verified=False,
    )

    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id

    access, refresh = _issue_tokens(str(result.inserted_id))
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=public_user(doc),
    )


@router.post("/login", response_model=TokenResponse)
@_rate_limit("5/minute")
async def login(request: Request, req: LoginRequest):
    """Exchange email+password for access + refresh JWTs."""
    users = _require_users_collection()
    await ensure_indexes()

    email_norm = req.email.lower().strip()
    doc = await users.find_one({"email": email_norm})
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with that email.",
        )
    if doc.get("auth_provider") == "google" and not doc.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google Sign-In. Please continue with Google.",
        )
    if not verify_password(req.password, doc.get("password_hash") or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )

    await _touch_last_login(doc["_id"])
    access, refresh = _issue_tokens(str(doc["_id"]))
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=public_user(doc),
    )


@router.post("/google", response_model=TokenResponse)
@_rate_limit("10/minute")
async def google_auth(request: Request, req: GoogleAuthRequest):
    """
    Verify a Google ID token and upsert the user.

    The frontend (NextAuth Google provider) obtains the ID token from Google
    and forwards it here; we verify it against GOOGLE_CLIENT_ID, then either
    create a new user document or update the existing one.

    Any unhandled error is logged with a full traceback so we can see the
    real cause in the backend terminal instead of a naked 500.
    """
    try:
        users = _require_users_collection()
        await ensure_indexes()

        claims = verify_google_id_token(req.id_token)
        email = (claims.get("email") or "").lower().strip()
        google_sub = claims.get("sub")
        if not email or not google_sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token did not include an email or subject.",
            )

        name = claims.get("name") or email.split("@")[0]
        avatar_url = claims.get("picture")
        email_verified = bool(claims.get("email_verified", False))

        doc = await users.find_one(
            {"$or": [{"email": email}, {"google_id": google_sub}]}
        )
        if doc is None:
            new_doc = new_user_document(
                name=name,
                email=email,
                auth_provider="google",
                google_id=google_sub,
                avatar_url=avatar_url,
                email_verified=email_verified,
            )
            result = await users.insert_one(new_doc)
            new_doc["_id"] = result.inserted_id
            doc = new_doc
        else:
            # Link Google to existing account + refresh profile basics.
            update_fields: dict[str, Any] = {
                "google_id": google_sub,
                "avatar_url": avatar_url or doc.get("avatar_url"),
                "email_verified": email_verified or doc.get("email_verified", False),
                "last_login": now_utc(),
                "updated_at": now_utc(),
            }
            if doc.get("auth_provider") != "email":
                update_fields["auth_provider"] = "google"
            await users.update_one({"_id": doc["_id"]}, {"$set": update_fields})
            doc.update(update_fields)

        access, refresh = _issue_tokens(str(doc["_id"]))
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            user=public_user(doc),
        )

    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        tb = traceback.format_exc()
        logger.error("google_auth failed: %s\n%s", exc, tb)
        print("\n=== /api/v1/auth/google CRASH ===\n" + tb + "================================\n", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google sign-in failed: {type(exc).__name__}: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# Endpoints — token lifecycle
# ---------------------------------------------------------------------------


@router.post("/refresh", response_model=TokenResponse)
@_rate_limit("30/minute")
async def refresh(request: Request, req: RefreshRequest):
    """Swap a refresh token for a new access token (and a rotated refresh token)."""
    payload = verify_token(req.refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing a subject.",
        )

    doc = await _find_user_by_any_id(user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for this refresh token.",
        )

    # Rotate the refresh token on every use — revoke the old jti so it
    # cannot be replayed if it leaks after the user got a fresh pair.
    old_jti = payload.get("jti")
    if old_jti:
        revoke_jti(old_jti)

    access, new_refresh = _issue_tokens(str(doc["_id"]))
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        user=public_user(doc),
    )


@router.post("/logout")
async def logout(
    ctx: tuple[dict[str, Any], dict[str, Any]] = Depends(require_auth_with_token),
):
    """
    Revoke the current access token's jti so subsequent requests 401.

    Refresh tokens are not tracked here — they auto-expire after 30 days
    and rotate on every /refresh call. If a refresh token is compromised,
    re-authenticate to invalidate the chain.
    """
    user, payload = ctx
    jti = payload.get("jti") or user.get("_current_jti")
    if jti:
        revoke_jti(jti)
    return {"ok": True, "message": f"Kwaheri, {user.get('name') or 'rafiki'}!"}


# ---------------------------------------------------------------------------
# Endpoints — email verification
# ---------------------------------------------------------------------------


@router.post("/verify-email/request")
@_rate_limit("3/minute")
async def verify_email_request(
    request: Request,
    user: dict[str, Any] = Depends(require_auth),
):
    """
    Issue a short-lived (1 hour) verification token for the signed-in user.

    Production: email the link `/verify?token=...` to the user. For the
    hackathon demo we return the token in the JSON response so the flow
    is testable without SMTP. Remove `dev_only_token` before production.
    """
    if user.get("email_verified"):
        return {"ok": True, "message": "Email already verified.", "already": True}

    token = create_purpose_token(
        str(user["_id"]),
        purpose="verify_email",
        expires_in=timedelta(hours=1),
    )
    return {
        "ok": True,
        "message": "Verification link sent (if email delivery is configured).",
        "dev_only_token": token,
    }


@router.post("/verify-email/confirm")
@_rate_limit("10/minute")
async def verify_email_confirm(request: Request, req: VerifyEmailRequest):
    """Consume a verification token and flip `email_verified=True`."""
    payload = verify_token(req.token, expected_type="purpose")
    if payload.get("purpose") != "verify_email":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This token is not a verification token.",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is missing a subject.",
        )

    users = _require_users_collection()
    doc = await _find_user_by_any_id(user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    await users.update_one(
        {"_id": doc["_id"]},
        {"$set": {"email_verified": True, "updated_at": now_utc()}},
    )
    # Single-use — revoke the jti so the same token can't verify twice.
    jti = payload.get("jti")
    if jti:
        revoke_jti(jti)
    return {"ok": True, "email_verified": True}


# ---------------------------------------------------------------------------
# Endpoints — password reset
# ---------------------------------------------------------------------------


@router.post("/forgot-password")
@_rate_limit("3/minute")
async def forgot_password(request: Request, req: ForgotPasswordRequest):
    """
    Issue a short-lived (30 min) password-reset token.

    Always returns 200 — we do not reveal whether the email exists, to
    avoid turning this endpoint into an account-enumeration oracle.
    """
    users = _require_users_collection()
    email_norm = req.email.lower().strip()
    doc = await users.find_one({"email": email_norm})

    response: dict[str, Any] = {
        "ok": True,
        "message": "If an account exists for that email, a reset link has been sent.",
    }
    if doc is not None and doc.get("password_hash"):
        token = create_purpose_token(
            str(doc["_id"]),
            purpose="password_reset",
            expires_in=timedelta(minutes=30),
        )
        # Dev-only: surface the token so the demo works without email.
        response["dev_only_token"] = token
    return response


@router.post("/reset-password")
@_rate_limit("5/minute")
async def reset_password(request: Request, req: ResetPasswordRequest):
    """Consume a password-reset token and set a new password."""
    payload = verify_token(req.token, expected_type="purpose")
    if payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This token is not a password-reset token.",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is missing a subject.",
        )

    users = _require_users_collection()
    doc = await _find_user_by_any_id(user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    await users.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "password_hash": hash_password(req.new_password),
                "auth_provider": doc.get("auth_provider") or "email",
                "updated_at": now_utc(),
            }
        },
    )
    # Single-use — revoke the jti so the same reset link can't be reused.
    jti = payload.get("jti")
    if jti:
        revoke_jti(jti)
    return {"ok": True, "message": "Password updated. Please sign in."}


# ---------------------------------------------------------------------------
# Endpoints — profile
# ---------------------------------------------------------------------------


@router.get("/me")
async def me(user: dict[str, Any] = Depends(require_auth)):
    """Return the full sanitised profile of the signed-in user."""
    return serialize_user(user)


@router.patch("/profile")
async def update_profile(
    patch: ProfilePatch,
    user: dict[str, Any] = Depends(require_auth),
):
    """Update editable profile fields."""
    users = _require_users_collection()
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    if not updates:
        return serialize_user(user)
    updates["updated_at"] = now_utc()
    await users.update_one({"_id": user["_id"]}, {"$set": updates})
    refreshed = await users.find_one({"_id": user["_id"]})
    return serialize_user(refreshed or user)
