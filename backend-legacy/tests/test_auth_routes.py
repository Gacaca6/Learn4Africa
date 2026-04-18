"""End-to-end tests for the /api/v1/auth/* routes via FastAPI TestClient."""

from __future__ import annotations

from typing import Any


BASE = "/api/v1/auth"


def _register(client, email="leila@example.com", password="Strong-pass-1") -> dict:
    resp = client.post(
        f"{BASE}/register",
        json={
            "name": "Leila",
            "email": email,
            "password": password,
            "country": "Rwanda",
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


def test_register_returns_access_and_refresh(client) -> None:
    data = _register(client)
    assert "access_token" in data and data["access_token"]
    assert "refresh_token" in data and data["refresh_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "leila@example.com"


def test_register_duplicate_email_is_409(client) -> None:
    _register(client)
    resp = client.post(
        f"{BASE}/register",
        json={
            "name": "Leila 2",
            "email": "leila@example.com",
            "password": "Another-pass-1",
        },
    )
    assert resp.status_code == 409


def test_register_rejects_weak_password(client) -> None:
    resp = client.post(
        f"{BASE}/register",
        json={
            "name": "Weak",
            "email": "weak@example.com",
            "password": "abc",  # too short + no digit
        },
    )
    assert resp.status_code == 422


def test_register_rejects_letters_only_password(client) -> None:
    resp = client.post(
        f"{BASE}/register",
        json={
            "name": "NoDigit",
            "email": "nd@example.com",
            "password": "allletters",
        },
    )
    assert resp.status_code == 422
    assert "number" in resp.text.lower()


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_success_returns_tokens(client) -> None:
    _register(client)
    resp = client.post(
        f"{BASE}/login",
        json={"email": "leila@example.com", "password": "Strong-pass-1"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]


def test_login_wrong_password_is_401(client) -> None:
    _register(client)
    resp = client.post(
        f"{BASE}/login",
        json={"email": "leila@example.com", "password": "Wrong-pass-1"},
    )
    assert resp.status_code == 401


def test_login_unknown_email_is_401(client) -> None:
    resp = client.post(
        f"{BASE}/login",
        json={"email": "ghost@example.com", "password": "Whatever-pass-1"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /me + /profile
# ---------------------------------------------------------------------------


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_me_returns_user_when_authed(client) -> None:
    data = _register(client)
    resp = client.get(f"{BASE}/me", headers=_auth(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["email"] == "leila@example.com"


def test_me_without_token_is_401(client) -> None:
    resp = client.get(f"{BASE}/me")
    assert resp.status_code == 401


def test_profile_patch_updates_fields(client) -> None:
    data = _register(client)
    resp = client.patch(
        f"{BASE}/profile",
        json={"bio": "Kigali builder.", "portfolio_public": True},
        headers=_auth(data["access_token"]),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["bio"] == "Kigali builder."
    assert body["portfolio_public"] is True


# ---------------------------------------------------------------------------
# Logout → revoked jti
# ---------------------------------------------------------------------------


def test_logout_revokes_current_jti(client) -> None:
    data = _register(client)
    token = data["access_token"]
    # First /me works
    assert client.get(f"{BASE}/me", headers=_auth(token)).status_code == 200
    # Logout
    lo = client.post(f"{BASE}/logout", headers=_auth(token))
    assert lo.status_code == 200
    # Same token now 401
    assert client.get(f"{BASE}/me", headers=_auth(token)).status_code == 401


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------


def test_refresh_rotates_tokens(client) -> None:
    data = _register(client)
    refresh = data["refresh_token"]
    resp = client.post(f"{BASE}/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200, resp.text
    new_tokens = resp.json()
    assert new_tokens["access_token"] != data["access_token"]
    assert new_tokens["refresh_token"] != refresh
    # Old refresh token is now revoked
    again = client.post(f"{BASE}/refresh", json={"refresh_token": refresh})
    assert again.status_code == 401


def test_refresh_rejects_access_token(client) -> None:
    data = _register(client)
    resp = client.post(
        f"{BASE}/refresh", json={"refresh_token": data["access_token"]}
    )
    # Access tokens must not be accepted at /refresh
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------


def test_forgot_password_always_200(client) -> None:
    # Unknown email — must still 200 (no enumeration).
    resp = client.post(
        f"{BASE}/forgot-password", json={"email": "nobody@example.com"}
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    # Known email — also 200, and exposes the dev-only token.
    _register(client)
    resp2 = client.post(
        f"{BASE}/forgot-password", json={"email": "leila@example.com"}
    )
    assert resp2.status_code == 200
    assert "dev_only_token" in resp2.json()


def test_reset_password_flow(client) -> None:
    _register(client)
    issue = client.post(
        f"{BASE}/forgot-password", json={"email": "leila@example.com"}
    ).json()
    token = issue["dev_only_token"]

    # Reset
    rp = client.post(
        f"{BASE}/reset-password",
        json={"token": token, "new_password": "Brand-new-pass-1"},
    )
    assert rp.status_code == 200

    # Old password fails
    old = client.post(
        f"{BASE}/login",
        json={"email": "leila@example.com", "password": "Strong-pass-1"},
    )
    assert old.status_code == 401

    # New password works
    new = client.post(
        f"{BASE}/login",
        json={"email": "leila@example.com", "password": "Brand-new-pass-1"},
    )
    assert new.status_code == 200

    # Token cannot be reused
    reuse = client.post(
        f"{BASE}/reset-password",
        json={"token": token, "new_password": "Yet-another-pass-1"},
    )
    assert reuse.status_code == 401


def test_reset_password_rejects_verify_token(client) -> None:
    """A purpose token issued for email verification must not reset a password."""
    data = _register(client)
    issue = client.post(
        f"{BASE}/verify-email/request", headers=_auth(data["access_token"])
    )
    assert issue.status_code == 200
    verify_token = issue.json()["dev_only_token"]
    resp = client.post(
        f"{BASE}/reset-password",
        json={"token": verify_token, "new_password": "Brand-new-pass-1"},
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Verify email
# ---------------------------------------------------------------------------


def test_verify_email_flow(client) -> None:
    data = _register(client)
    # Before confirmation
    me = client.get(f"{BASE}/me", headers=_auth(data["access_token"])).json()
    assert me["email_verified"] is False

    issue = client.post(
        f"{BASE}/verify-email/request", headers=_auth(data["access_token"])
    )
    assert issue.status_code == 200
    token = issue.json()["dev_only_token"]

    confirm = client.post(
        f"{BASE}/verify-email/confirm", json={"token": token}
    )
    assert confirm.status_code == 200
    assert confirm.json()["email_verified"] is True

    me2 = client.get(f"{BASE}/me", headers=_auth(data["access_token"])).json()
    assert me2["email_verified"] is True

    # Replay must fail (jti revoked after single use)
    again = client.post(
        f"{BASE}/verify-email/confirm", json={"token": token}
    )
    assert again.status_code == 401


# ---------------------------------------------------------------------------
# Public portfolio privacy gate
# ---------------------------------------------------------------------------


def test_public_portfolio_404_when_private(client) -> None:
    data = _register(client)
    user_id = data["user"]["id"]
    # portfolio_public defaults to False → 404
    resp = client.get(f"/api/v1/users/{user_id}/portfolio")
    assert resp.status_code == 404


def test_public_portfolio_200_when_opted_in(client) -> None:
    data = _register(client)
    client.patch(
        f"{BASE}/profile",
        json={"portfolio_public": True, "bio": "Open book."},
        headers=_auth(data["access_token"]),
    )
    resp = client.get(f"/api/v1/users/{data['user']['id']}/portfolio")
    assert resp.status_code == 200
    assert resp.json()["bio"] == "Open book."


# ---------------------------------------------------------------------------
# Status + version + health — smoke
# ---------------------------------------------------------------------------


def test_health_endpoint(client) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200


def test_version_endpoint_reports_build(client) -> None:
    resp = client.get("/version")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Learn4Africa"
    assert body["version"]
    assert body["build"]


def test_status_endpoint_reports_mongo(client) -> None:
    resp = client.get("/status")
    assert resp.status_code == 200
    body = resp.json()
    assert "uptime_seconds" in body
    assert "mongo" in body
