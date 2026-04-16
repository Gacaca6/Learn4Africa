"""
Learn4Africa — Curriculum Routes

Live streaming curriculum build + pre-built demo curriculum loader.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from engines.curriculum_builder import stream_build_curriculum

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "curricula"


class BuildCurriculumRequest(BaseModel):
    goal: str
    level: str = "beginner"


@router.post("/build")
async def build_curriculum_stream(req: BuildCurriculumRequest):
    """
    Live-build a curriculum for a student's goal. Returns a Server-Sent
    Events (SSE) stream of progress updates, finishing with the full
    curriculum object.

    Client consumes this with EventSource or fetch + ReadableStream.
    """

    async def event_stream():
        async for event in stream_build_curriculum(goal=req.goal, level=req.level):
            payload = json.dumps(event, ensure_ascii=False)
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # disable proxy buffering
            "Connection": "keep-alive",
        },
    )


@router.get("/demo/{slug}")
async def get_demo_curriculum(slug: str):
    """
    Return a pre-built curriculum JSON instantly.
    Safety net for the hackathon demo — no live AI or API calls needed.
    """
    safe_slug = slug.replace("/", "").replace("\\", "").replace("..", "")
    path = DATA_DIR / f"{safe_slug}.json"

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No pre-built curriculum found for '{slug}'. Run backend/scripts/prebuild_curricula.py first.",
        )

    try:
        with open(path, "r", encoding="utf-8") as f:
            curriculum = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load curriculum: {e}")

    return {"status": "success", "curriculum": curriculum}


@router.get("/demo")
async def list_demo_curricula():
    """List all pre-built demo curricula available."""
    if not DATA_DIR.exists():
        return {"demos": []}

    demos = []
    for f in DATA_DIR.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            demos.append({
                "slug": f.stem,
                "title": data.get("title", ""),
                "goal": data.get("goal", ""),
                "module_count": len(data.get("modules", [])),
                "career_outcome": data.get("career_outcome", ""),
            })
        except Exception:
            continue

    return {"demos": demos}
