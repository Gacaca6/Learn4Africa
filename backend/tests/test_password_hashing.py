"""Tests for bcrypt hashing + policy enforcement."""

from __future__ import annotations

import pytest

from engines.auth_engine import (
    hash_password,
    validate_password_policy,
    verify_password,
)


def test_hash_roundtrip() -> None:
    h = hash_password("correct-horse-battery-staple-42")
    assert h != "correct-horse-battery-staple-42"  # must actually hash
    assert verify_password("correct-horse-battery-staple-42", h) is True


def test_verify_rejects_wrong_password() -> None:
    h = hash_password("right-password-1")
    assert verify_password("wrong-password-1", h) is False


def test_verify_rejects_empty_inputs() -> None:
    h = hash_password("some-password-1")
    assert verify_password("", h) is False
    assert verify_password("some-password-1", "") is False


def test_hash_is_non_deterministic() -> None:
    """bcrypt salts each hash — two runs must differ."""
    a = hash_password("same-input-1")
    b = hash_password("same-input-1")
    assert a != b
    assert verify_password("same-input-1", a)
    assert verify_password("same-input-1", b)


# ---------------------------------------------------------------------------
# Policy
# ---------------------------------------------------------------------------


def test_policy_accepts_valid_password() -> None:
    validate_password_policy("letters1")  # 8 chars, letter, digit — OK


def test_policy_rejects_too_short() -> None:
    with pytest.raises(ValueError, match="at least 8"):
        validate_password_policy("a1b2c3")


def test_policy_rejects_missing_letter() -> None:
    with pytest.raises(ValueError, match="letter"):
        validate_password_policy("12345678")


def test_policy_rejects_missing_digit() -> None:
    with pytest.raises(ValueError, match="number"):
        validate_password_policy("onlyletters")


def test_policy_rejects_non_string() -> None:
    with pytest.raises(ValueError, match="string"):
        validate_password_policy(12345678)  # type: ignore[arg-type]
