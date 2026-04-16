"""
Learn4Africa — Comic Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.comic import generate_comic_script, generate_full_comic

router = APIRouter()


class GenerateComicRequest(BaseModel):
    lesson_content: str
    lesson_title: str
    language: str = "en"
    age_group: str = "general"
    num_panels: int = 6


@router.post("/generate")
async def create_comic(req: GenerateComicRequest):
    """Generate a full educational comic with images."""
    try:
        panels = await generate_full_comic(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
        )
        return {"status": "success", "panels": panels, "count": len(panels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/script-only")
async def create_comic_script(req: GenerateComicRequest):
    """Generate just the comic script (no images — for low bandwidth)."""
    try:
        script = await generate_comic_script(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
            num_panels=req.num_panels,
        )
        return {"status": "success", "script": script}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
