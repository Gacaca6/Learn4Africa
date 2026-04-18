"""
Learn4Africa — Video Quality Scorer

Scores YouTube videos on a 0-100 scale based on channel trust,
engagement ratios, duration fit, caption quality, and freshness.
Used by the curriculum builder to pick the single best video per module.
"""

from datetime import datetime, timezone
from typing import Optional


TRUSTED_CHANNELS = [
    "freeCodeCamp.org",
    "Traversy Media",
    "CS50",
    "Bro Code",
    "Alex The Analyst",
    "Corey Schafer",
    "The Organic Chemistry Tutor",
    "Programming with Mosh",
    "Tech With Tim",
    "Kevin Powell",
    "NetworkChuck",
    "TechWorld with Nana",
    "Fireship",
    "Simplilearn",
    "edureka!",
    "Great Learning",
]

# Keywords in a title that signal a beginner-friendly, complete tutorial
BEGINNER_SIGNALS = [
    "beginner",
    "beginners",
    "basics",
    "intro",
    "introduction",
    "crash course",
    "from scratch",
    "full course",
    "full tutorial",
    "complete tutorial",
    "for dummies",
    "learn",
    "step by step",
]


def _parse_published(published_at: str) -> Optional[datetime]:
    if not published_at:
        return None
    try:
        # YouTube returns ISO 8601 like 2021-06-15T14:30:00Z
        return datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    except ValueError:
        return None


def score_video(video: dict, topic: str = "", level: str = "beginner") -> float:
    """
    Score a video 0-100 on quality and fit.
    Higher is better. Scores below 20 are considered unusable.
    """
    score: float = 0.0

    channel = video.get("channel_title", "") or ""
    title = (video.get("title", "") or "").lower()
    description = video.get("description", "") or ""
    duration = video.get("duration_seconds", 0) or 0
    views = video.get("view_count", 0) or 0
    likes = video.get("like_count", 0) or 0
    has_captions = bool(video.get("has_captions"))
    published_at = video.get("published_at", "")

    # ── Trusted channel (+40) ─────────────────────────────────
    if channel in TRUSTED_CHANNELS:
        score += 40

    # ── Like/view ratio ──────────────────────────────────────
    if views >= 100:
        ratio = (likes / views) * 100 if views else 0
        if ratio >= 4:
            score += 20
        elif ratio >= 2:
            score += 10
        elif ratio < 0.5:
            score -= 20

    # ── Duration fit (in minutes) ────────────────────────────
    minutes = duration / 60 if duration else 0
    if 8 <= minutes <= 35:
        score += 15
    elif 35 < minutes <= 45:
        score += 8
    elif minutes < 5 or minutes > 50:
        score -= 20

    # ── Real captions (+10) ──────────────────────────────────
    # YouTube's "caption: true" field in contentDetails signals non-auto captions
    if has_captions:
        score += 10

    # ── Beginner-friendly title (+10) ────────────────────────
    if level == "beginner" and any(signal in title for signal in BEGINNER_SIGNALS):
        score += 10
    elif level != "beginner" and any(w in title for w in ["advanced", "deep dive", "mastery", "in depth"]):
        score += 10

    # ── View count thresholds (+5) ───────────────────────────
    if views >= 100_000:
        score += 5

    # ── Description effort (+5) ──────────────────────────────
    if len(description) >= 200:
        score += 5

    # ── Freshness: published within 4 years (+5) ─────────────
    published = _parse_published(published_at)
    if published:
        now = datetime.now(timezone.utc)
        age_years = (now - published).days / 365.25
        if age_years <= 4:
            score += 5

    # Clamp to 0-100 window (allows negative signals to accumulate but cap ceiling)
    if score > 100:
        score = 100.0

    return score


def select_best_video(
    videos: list[dict], topic: str = "", level: str = "beginner"
) -> Optional[dict]:
    """
    Score every candidate video and return the single best one.
    Adds the computed `score` onto the returned dict for downstream display.
    Returns None if no video scores above 20.
    """
    if not videos:
        return None

    best: Optional[dict] = None
    best_score: float = -1.0

    scored: list[tuple[float, dict]] = []
    for v in videos:
        s = score_video(v, topic=topic, level=level)
        scored.append((s, v))
        if s > best_score:
            best_score = s
            best = v

    if best is None or best_score < 20:
        return None

    # Attach score and all scored candidates for debugging/transparency
    enriched = dict(best)
    enriched["score"] = round(best_score, 1)
    return enriched
