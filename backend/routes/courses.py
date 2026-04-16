"""
Learn4Africa — Course Routes
Create and browse AI-generated courses.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.course import generate_course_outline, generate_lesson_content

router = APIRouter()


class CreateCourseRequest(BaseModel):
    topic: str
    difficulty: str = "beginner"
    language: str = "en"
    age_group: str = "general"
    num_chapters: int = 5


class GenerateLessonRequest(BaseModel):
    lesson_title: str
    chapter_title: str
    course_title: str
    key_concepts: list[str]
    difficulty: str = "beginner"
    language: str = "en"
    age_group: str = "general"


@router.post("/generate")
async def create_course(req: CreateCourseRequest):
    """
    Generate a complete course from any topic.
    Tell us what you want to learn — we'll build the entire course for you.
    """
    try:
        outline = await generate_course_outline(
            topic=req.topic,
            difficulty=req.difficulty,
            language=req.language,
            age_group=req.age_group,
            num_chapters=req.num_chapters,
        )
        return {
            "status": "success",
            "message": f"Course created: {outline.get('title', req.topic)}",
            "course": outline,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate course: {str(e)}")


@router.post("/generate-lesson")
async def create_lesson(req: GenerateLessonRequest):
    """Generate the full reading content for a single lesson."""
    try:
        content = await generate_lesson_content(
            lesson_title=req.lesson_title,
            chapter_title=req.chapter_title,
            course_title=req.course_title,
            key_concepts=req.key_concepts,
            difficulty=req.difficulty,
            language=req.language,
            age_group=req.age_group,
        )
        return {
            "status": "success",
            "lesson_title": req.lesson_title,
            "content": content,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate lesson: {str(e)}")


@router.get("/categories")
async def get_categories():
    """Get available course categories."""
    return {
        "categories": [
            {"id": "ai-tech", "name": "AI & Technology", "icon": "cpu", "description": "Artificial Intelligence, Programming, Data Science"},
            {"id": "science", "name": "Science", "icon": "flask", "description": "Physics, Chemistry, Biology, Earth Science"},
            {"id": "math", "name": "Mathematics", "icon": "calculator", "description": "Arithmetic to Advanced Mathematics"},
            {"id": "languages", "name": "Languages", "icon": "globe", "description": "English, French, Swahili, Arabic, and more"},
            {"id": "history", "name": "African History", "icon": "landmark", "description": "Rich history of the African continent"},
            {"id": "business", "name": "Business & Finance", "icon": "briefcase", "description": "Entrepreneurship, Money Management, Trade"},
            {"id": "health", "name": "Health & Wellness", "icon": "heart", "description": "Nutrition, First Aid, Mental Health"},
            {"id": "arts", "name": "Arts & Culture", "icon": "palette", "description": "Music, Art, Literature, Cultural Heritage"},
            {"id": "trades", "name": "Practical Trades", "icon": "wrench", "description": "Carpentry, Farming, Tailoring, Mechanics"},
            {"id": "environment", "name": "Environment", "icon": "leaf", "description": "Climate, Conservation, Sustainable Living"},
        ]
    }
