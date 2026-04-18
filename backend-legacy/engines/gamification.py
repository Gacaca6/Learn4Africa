"""
Learn4Africa — Gamification Engine
XP, levels, badges, streaks, and leaderboards.
Designed to make learning feel like an adventure.
"""

from datetime import datetime, timedelta

from utils.time import now_utc

# ── XP Rewards ──
XP_REWARDS = {
    "complete_reading": 20,
    "flashcard_correct": 5,
    "flashcard_streak_5": 25,
    "quiz_perfect": 100,
    "quiz_pass": 50,
    "quiz_attempt": 10,
    "podcast_listen": 30,
    "comic_read": 15,
    "game_win": 40,
    "song_listen": 10,
    "lesson_complete": 50,
    "chapter_complete": 200,
    "course_complete": 500,
    "daily_login": 10,
    "streak_7_days": 100,
    "streak_30_days": 500,
    "help_another_learner": 30,
    "first_course": 100,
}

# ── Level Thresholds ──
def calculate_level(xp: int) -> int:
    """Calculate level from XP. Each level requires progressively more XP."""
    level = 1
    xp_needed = 100
    remaining = xp
    while remaining >= xp_needed:
        remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.3)
    return level


def xp_for_next_level(xp: int) -> dict:
    """Calculate progress toward next level."""
    level = 1
    xp_needed = 100
    remaining = xp
    while remaining >= xp_needed:
        remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.3)
    return {
        "current_level": level,
        "xp_in_current_level": remaining,
        "xp_needed_for_next": xp_needed,
        "progress_percent": round((remaining / xp_needed) * 100, 1),
    }


# ── Badges ──
BADGES = {
    "first_step": {
        "name": "First Step",
        "description": "Completed your first lesson",
        "icon": "footprints",
        "condition": lambda stats: stats.get("lessons_completed", 0) >= 1,
    },
    "curious_mind": {
        "name": "Curious Mind",
        "description": "Asked Mwalimu 10 questions",
        "icon": "lightbulb",
        "condition": lambda stats: stats.get("tutor_questions", 0) >= 10,
    },
    "bookworm": {
        "name": "Bookworm",
        "description": "Read 20 lessons",
        "icon": "book-open",
        "condition": lambda stats: stats.get("readings_completed", 0) >= 20,
    },
    "quiz_master": {
        "name": "Quiz Master",
        "description": "Scored 100% on 5 quizzes",
        "icon": "trophy",
        "condition": lambda stats: stats.get("perfect_quizzes", 0) >= 5,
    },
    "streak_keeper": {
        "name": "Streak Keeper",
        "description": "7-day learning streak",
        "icon": "flame",
        "condition": lambda stats: stats.get("streak_days", 0) >= 7,
    },
    "unstoppable": {
        "name": "Unstoppable",
        "description": "30-day learning streak",
        "icon": "rocket",
        "condition": lambda stats: stats.get("streak_days", 0) >= 30,
    },
    "explorer": {
        "name": "Explorer",
        "description": "Tried all 8 learning formats",
        "icon": "compass",
        "condition": lambda stats: stats.get("formats_tried", 0) >= 8,
    },
    "scholar": {
        "name": "Scholar",
        "description": "Completed 5 courses",
        "icon": "graduation-cap",
        "condition": lambda stats: stats.get("courses_completed", 0) >= 5,
    },
    "polyglot": {
        "name": "Polyglot",
        "description": "Learned in 2 different languages",
        "icon": "globe",
        "condition": lambda stats: stats.get("languages_used", 0) >= 2,
    },
    "night_owl": {
        "name": "Night Owl",
        "description": "Studied after 10 PM",
        "icon": "moon",
        "condition": lambda stats: stats.get("late_study", False),
    },
    "early_bird": {
        "name": "Early Bird",
        "description": "Studied before 6 AM",
        "icon": "sunrise",
        "condition": lambda stats: stats.get("early_study", False),
    },
    "community_hero": {
        "name": "Community Hero",
        "description": "Helped 5 other learners",
        "icon": "heart",
        "condition": lambda stats: stats.get("learners_helped", 0) >= 5,
    },
}


def check_new_badges(current_badges: list[str], stats: dict) -> list[dict]:
    """Check if any new badges have been earned."""
    new_badges = []
    for badge_id, badge in BADGES.items():
        if badge_id not in current_badges and badge["condition"](stats):
            new_badges.append({
                "id": badge_id,
                "name": badge["name"],
                "description": badge["description"],
                "icon": badge["icon"],
            })
    return new_badges


def update_streak(last_active: datetime | None) -> dict:
    """Update daily learning streak."""
    now = now_utc()

    if last_active is None:
        return {"streak_days": 1, "streak_continued": True}

    days_diff = (now.date() - last_active.date()).days

    if days_diff == 0:
        return {"streak_days": 0, "streak_continued": True, "already_active_today": True}
    elif days_diff == 1:
        return {"streak_days": 1, "streak_continued": True}
    else:
        return {"streak_days": 1, "streak_continued": False, "streak_broken": True}
