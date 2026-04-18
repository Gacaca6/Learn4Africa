"""
Learn4Africa — Flashcard Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.flashcards import generate_flashcards, calculate_next_review

router = APIRouter()


class GenerateFlashcardsRequest(BaseModel):
    lesson_content: str
    num_cards: int = 10
    difficulty: str = "beginner"
    language: str = "en"


class ReviewCardRequest(BaseModel):
    card_id: str
    quality: int  # 0-5: 0=blank, 5=perfect recall
    history: dict = {}


@router.post("/generate")
async def create_flashcards(req: GenerateFlashcardsRequest):
    """Generate flashcards from lesson content."""
    try:
        cards = await generate_flashcards(
            lesson_content=req.lesson_content,
            num_cards=req.num_cards,
            difficulty=req.difficulty,
            language=req.language,
        )
        return {"status": "success", "cards": cards, "count": len(cards)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review")
async def review_card(req: ReviewCardRequest):
    """Submit a flashcard review and get next review schedule (SM-2 algorithm)."""
    schedule = calculate_next_review(req.card_id, req.quality, req.history)
    return {"status": "success", "schedule": schedule}
