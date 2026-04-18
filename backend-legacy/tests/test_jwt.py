"""Tests for JWT creation, type checking, and revocation."""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi import HTTPException

from engines.auth_engine import (
    _revoked_jti,
    create_access_token,
    create_purpose_token,
    create_refresh_token,
    is_revoked,
    revoke_jti,
    verify_token,
)


@pytest.fixture(autouse=True)
def _clear_revocation():
    """Keep the in-memory blocklist isolated per-test."""
    _revoked_jti.clear()
    yield
    _revoked_jti.clear()


# ---------------------------------------------------------------------------
# Token creation + type discrimination
# ---------------------------------------------------------------------------


def test_access_token_carries_expected_claims() -> None:
    token = create_access_token("user-abc")
    payload = verify_token(token, expected_type="access")
    assert payload["sub"] == "user-abc"
    assert payload["type"] == "access"
    assert "jti" in payload and len(payload["jti"]) == 32


def test_refresh_token_cannot_be_used_as_access() -> None:
    token = create_refresh_token("user-abc")
    # Plain verify works (it's a valid refresh token)
    payload = verify_token(token, expected_type="refresh")
    assert payload["type"] == "refresh"
    # But asking for access must 401
    with pytest.raises(HTTPException) as exc:
        verify_token(token, expected_type="access")
    assert exc.value.status_code == 401


def test_purpose_token_carries_purpose_claim() -> None:
    token = create_purpose_token(
        "user-abc", purpose="verify_email", expires_in=timedelta(minutes=5)
    )
    payload = verify_token(token, expected_type="purpose")
    assert payload["purpose"] == "verify_email"
    assert payload["type"] == "purpose"


# ---------------------------------------------------------------------------
# Revocation
# ---------------------------------------------------------------------------


def test_revoked_token_is_rejected() -> None:
    token = create_access_token("user-abc")
    payload = verify_token(token)
    jti = payload["jti"]
    assert is_revoked(jti) is False
    revoke_jti(jti)
    assert is_revoked(jti) is True
    with pytest.raises(HTTPException) as exc:
        verify_token(token)
    assert exc.value.status_code == 401
    assert "revoked" in exc.value.detail.lower()


def test_revoke_jti_is_idempotent() -> None:
    revoke_jti("abc")
    revoke_jti("abc")  # must not raise
    assert is_revoked("abc")


def test_revoke_empty_jti_noop() -> None:
    revoke_jti("")
    assert is_revoked("") is False


# ---------------------------------------------------------------------------
# Tampering / malformed tokens
# ---------------------------------------------------------------------------


def test_tampered_token_is_rejected() -> None:
    token = create_access_token("user-abc")
    # Flip a char in the signature segment
    header, payload, sig = token.split(".")
    tampered = ".".join([header, payload, sig[:-1] + ("a" if sig[-1] != "a" else "b")])
    with pytest.raises(HTTPException) as exc:
        verify_token(tampered)
    assert exc.value.status_code == 401


def test_garbage_token_is_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        verify_token("this-is-not-a-jwt")
    assert exc.value.status_code == 401
