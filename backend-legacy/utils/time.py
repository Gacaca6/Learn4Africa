"""
Learn4Africa — timezone-aware timestamp helpers.

`datetime.utcnow()` is deprecated in Python 3.12+ (scheduled for removal).
Always use `now_utc()` from this module so timestamps carry a tzinfo.

Why: motor/pymongo round-trips through BSON UTC; timezone-naive datetimes
compare unpredictably across the Windows/Linux boundary. A single helper
makes the intent explicit and keeps the codebase grep-friendly.
"""

from __future__ import annotations

from datetime import datetime, timezone


def now_utc() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)
