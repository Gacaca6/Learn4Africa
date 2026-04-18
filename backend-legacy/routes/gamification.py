"""
Learn4Africa — Gamification Routes
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from engines.gamification import (
    XP_REWARDS, BADGES, calculate_level, xp_for_next_level,
    check_new_badges, update_streak,
)

router = APIRouter()


class AwardXPRequest(BaseModel):
    user_id: str
    action: str  # Key from XP_REWARDS
    current_xp: int = 0
    current_badges: list[str] = []
    streak_days: int = 0
    stats: dict = {}
    last_active: str | None = None


@router.post("/award-xp")
async def award_xp(req: AwardXPRequest):
    """Award XP for a learning action and check for new badges/level-ups."""
    xp_gained = XP_REWARDS.get(req.action, 0)
    new_total = req.current_xp + xp_gained

    old_level = calculate_level(req.current_xp)
    new_level = calculate_level(new_total)
    leveled_up = new_level > old_level

    new_badges = check_new_badges(req.current_badges, req.stats)

    last_active = None
    if req.last_active:
        last_active = datetime.fromisoformat(req.last_active)
    streak_update = update_streak(last_active)

    return {
        "xp_gained": xp_gained,
        "total_xp": new_total,
        "level": new_level,
        "leveled_up": leveled_up,
        "progress": xp_for_next_level(new_total),
        "new_badges": new_badges,
        "streak": streak_update,
    }


@router.get("/badges")
async def get_all_badges():
    """Get all available badges and their requirements."""
    return {
        "badges": [
            {
                "id": badge_id,
                "name": badge["name"],
                "description": badge["description"],
                "icon": badge["icon"],
            }
            for badge_id, badge in BADGES.items()
        ]
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Get the learning leaderboard. In production, this queries the database."""
    # Placeholder — in production this queries GamificationProfile table
    return {
        "leaderboard": [
            {"rank": 1, "display_name": "Be the first learner!", "xp": 0, "level": 1},
        ],
        "message": "Start learning to appear on the leaderboard!",
    }
