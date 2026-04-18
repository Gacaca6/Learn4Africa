"""
Learn4Africa — Podcast Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.podcast import generate_podcast_script, generate_podcast_audio

router = APIRouter()


class GeneratePodcastRequest(BaseModel):
    lesson_content: str
    lesson_title: str
    language: str = "en"
    age_group: str = "general"


@router.post("/generate")
async def create_podcast(req: GeneratePodcastRequest):
    """Generate a podcast episode from lesson content (free, uses Edge TTS)."""
    try:
        script = await generate_podcast_script(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
        )

        audio_url = await generate_podcast_audio(script, language=req.language)

        return {
            "status": "success",
            "script": script,
            "audio_url": audio_url,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/script-only")
async def create_podcast_script(req: GeneratePodcastRequest):
    """Generate just the podcast script (no audio — saves bandwidth)."""
    try:
        script = await generate_podcast_script(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
        )
        return {"status": "success", "script": script}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
