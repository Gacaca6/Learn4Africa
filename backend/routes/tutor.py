"""
Learn4Africa — AI Tutor (Mwalimu) Routes
"""

from fastapi import APIRouter
from pydantic import BaseModel

from engines.tutor import tutor_chat, detect_struggle

router = APIRouter()


class TutorMessage(BaseModel):
    message: str
    conversation_history: list[dict] = []
    learner_name: str = "Friend"
    age_group: str = "general"
    language: str = "en"
    learning_style: str = "visual"
    current_topic: str = ""
    difficulty: str = "beginner"


@router.post("/chat")
async def chat_with_mwalimu(req: TutorMessage):
    """
    Chat with Mwalimu, your personal AI tutor.
    Mwalimu adapts to your learning style and guides you with patience and warmth.
    """
    response = await tutor_chat(
        user_message=req.message,
        conversation_history=req.conversation_history,
        learner_name=req.learner_name,
        age_group=req.age_group,
        language=req.language,
        learning_style=req.learning_style,
        current_topic=req.current_topic,
        difficulty=req.difficulty,
    )

    # Check if learner might be struggling
    full_history = req.conversation_history + [
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": response},
    ]
    struggle_check = await detect_struggle(full_history)

    return {
        "response": response,
        "struggle_detected": struggle_check.get("struggling", False),
        "recommendation": struggle_check.get("recommendation", "continue"),
    }
