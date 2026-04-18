"""
Learn4Africa — Quiz Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.quiz import generate_quiz, grade_short_answer

router = APIRouter()


class GenerateQuizRequest(BaseModel):
    lesson_content: str
    num_questions: int = 8
    difficulty: str = "beginner"
    language: str = "en"
    age_group: str = "general"


class GradeAnswerRequest(BaseModel):
    question: str
    expected_answer: str
    student_answer: str
    language: str = "en"


@router.post("/generate")
async def create_quiz(req: GenerateQuizRequest):
    """Generate a quiz from lesson content."""
    try:
        questions = await generate_quiz(
            lesson_content=req.lesson_content,
            num_questions=req.num_questions,
            difficulty=req.difficulty,
            language=req.language,
            age_group=req.age_group,
        )
        return {"status": "success", "questions": questions, "count": len(questions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade")
async def grade_answer(req: GradeAnswerRequest):
    """Grade a short answer using AI — with encouraging feedback."""
    result = await grade_short_answer(
        question=req.question,
        expected_answer=req.expected_answer,
        student_answer=req.student_answer,
        language=req.language,
    )
    return {"status": "success", "result": result}
