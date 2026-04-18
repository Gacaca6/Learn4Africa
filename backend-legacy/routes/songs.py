"""
Learn4Africa — Song Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.songs import generate_song_lyrics, generate_song_audio

router = APIRouter()


class GenerateSongRequest(BaseModel):
    lesson_content: str
    lesson_title: str
    language: str = "en"
    age_group: str = "general"
    style: str = "afrobeats"  # afrobeats, highlife, bongo_flava, hip_hop, folk, lullaby


@router.post("/generate")
async def create_song(req: GenerateSongRequest):
    """Generate an educational song from lesson content."""
    try:
        song = await generate_song_lyrics(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
            style=req.style,
        )

        audio_url = await generate_song_audio(
            lyrics=song.get("full_lyrics", ""),
            style=req.style,
            language=req.language,
        )

        return {
            "status": "success",
            "song": song,
            "audio_url": audio_url,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lyrics-only")
async def create_song_lyrics(req: GenerateSongRequest):
    """Generate just the lyrics (no audio)."""
    try:
        song = await generate_song_lyrics(
            lesson_content=req.lesson_content,
            lesson_title=req.lesson_title,
            language=req.language,
            age_group=req.age_group,
            style=req.style,
        )
        return {"status": "success", "song": song}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/styles")
async def get_music_styles():
    """Get available music styles."""
    return {
        "styles": [
            {"id": "afrobeats", "name": "Afrobeats", "description": "Upbeat, catchy, modern African pop"},
            {"id": "highlife", "name": "Highlife", "description": "Warm, melodic West African rhythm"},
            {"id": "bongo_flava", "name": "Bongo Flava", "description": "Tanzanian hip-hop with Swahili flair"},
            {"id": "hip_hop", "name": "Hip Hop", "description": "Clever rhymes and beats"},
            {"id": "folk", "name": "African Folk", "description": "Traditional call-and-response"},
            {"id": "lullaby", "name": "Lullaby", "description": "Gentle, soothing, for young learners"},
        ]
    }
