"""
Learn4Africa — Curriculum Builder Orchestrator

This is the brain of Learn4Africa. Given a student goal, it:
  1. Asks Mwalimu to design a curriculum skeleton
  2. Searches YouTube for the best video for each module
  3. Scores and selects the single best video
  4. Extracts the transcript and has Mwalimu process it
     into summary, concepts, flashcards, and a quiz
  5. Streams progress updates throughout

Used by:
  - /api/v1/curriculum/build (SSE live build)
  - scripts/prebuild_curricula.py (offline safety-net builds)
"""

import asyncio
import json
import re
import uuid
from typing import AsyncGenerator

from engines.curriculum_designer import design_curriculum
from engines.llm import chat
from engines.mwalimu import MWALIMU_SYSTEM, get_cultural_context
from engines.video_scorer import select_best_video
from engines.video_searcher import get_transcript, search_videos


# ─────────────────────────────────────────────────────────────
# Transcript → learning content
# ─────────────────────────────────────────────────────────────

async def process_transcript_for_module(
    transcript: str,
    module_title: str,
    topic: str,
) -> dict:
    """
    Ask Mwalimu to process a video transcript into structured learning
    content: summary, key concepts, African context, flashcards, and a quiz.
    """
    cultural_context = get_cultural_context(topic)

    system_prompt = f"""{MWALIMU_SYSTEM}

## Current Task
You are turning a YouTube video transcript into structured learning content
for a Learn4Africa module. Cultural grounding: {cultural_context}

Return ONLY valid JSON — no prose before or after, no markdown fences.
Use double quotes for all keys and string values."""

    # Cap transcript to ~6000 chars to stay within context budget
    trimmed = transcript.strip()
    if len(trimmed) > 6000:
        trimmed = trimmed[:6000] + "..."

    user_prompt = f"""Module: {module_title}
Topic area: {topic}

Here is the transcript of a YouTube tutorial that teaches this module:
---
{trimmed}
---

Turn this into structured Learn4Africa learning content. Return ONLY valid JSON:
{{
  "summary": "3-sentence plain English summary of what this module teaches",
  "key_concepts": [
    {{"concept": "name", "explanation": "one-line plain English explanation"}}
  ],
  "african_context": "One paragraph explaining why this matters to a student in Rwanda or anywhere in Africa. Ground it in real opportunities, markets, or daily life.",
  "flashcards": [
    {{"front": "question or prompt", "back": "concise answer"}}
  ],
  "quiz": [
    {{
      "question": "clear question",
      "options": ["A", "B", "C", "D"],
      "correct": "A",
      "explanation": "why this is right"
    }}
  ]
}}

Rules:
- Exactly 5 key_concepts
- Exactly 8 flashcards
- Exactly 5 quiz questions (multiple choice, 4 options each)
- Every flashcard and quiz question must come from the transcript content, not invented
- Keep language simple and encouraging"""

    response = await chat(
        [{"role": "user", "content": user_prompt}],
        system_prompt=system_prompt,
        temperature=0.5,
        max_tokens=3500,
    )

    return _parse_module_content(response)


def _parse_module_content(raw: str) -> dict:
    """Same robust parse as curriculum_designer, localised here."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        return _empty_module_content()

    chunk = text[start:end]
    chunk = re.sub(r",\s*([}\]])", r"\1", chunk)

    try:
        return json.loads(chunk)
    except json.JSONDecodeError:
        return _empty_module_content()


def _empty_module_content() -> dict:
    return {
        "summary": "",
        "key_concepts": [],
        "african_context": "",
        "flashcards": [],
        "quiz": [],
    }


# ─────────────────────────────────────────────────────────────
# Direct-teach fallback (when no good video exists)
# ─────────────────────────────────────────────────────────────

async def _mwalimu_teach_directly(module: dict, topic: str) -> dict:
    """
    When no good YouTube video is found, Mwalimu writes the entire module
    herself from the objectives. This guarantees every module has content.
    """
    cultural_context = get_cultural_context(topic)

    system_prompt = f"""{MWALIMU_SYSTEM}

## Current Task
No suitable YouTube video was found for this module, so you will teach it
directly. Write rich, original learning content that covers the objectives.
Cultural grounding: {cultural_context}

Return ONLY valid JSON — no prose, no markdown fences."""

    objectives = module.get("learning_objectives", []) or []
    user_prompt = f"""Module: {module.get('title', '')}
Description: {module.get('description', '')}
Learning objectives:
{chr(10).join('- ' + o for o in objectives)}

Return ONLY valid JSON in this exact structure:
{{
  "summary": "3-sentence plain English summary of what this module teaches",
  "key_concepts": [{{"concept": "name", "explanation": "one-line explanation"}}],
  "african_context": "One paragraph on why this matters in African/Rwandan context",
  "flashcards": [{{"front": "q", "back": "a"}}],
  "quiz": [
    {{"question": "q", "options": ["A","B","C","D"], "correct": "A", "explanation": "why"}}
  ]
}}

Rules: exactly 5 key_concepts, 8 flashcards, 5 quiz questions."""

    response = await chat(
        [{"role": "user", "content": user_prompt}],
        system_prompt=system_prompt,
        temperature=0.6,
        max_tokens=3500,
    )

    return _parse_module_content(response)


# ─────────────────────────────────────────────────────────────
# Full build (non-streaming)
# ─────────────────────────────────────────────────────────────

async def build_curriculum(goal: str, level: str = "beginner") -> dict:
    """
    Orchestrate the full curriculum build in one call (no streaming).
    Used by the prebuild script. For live user-facing builds, use
    stream_build_curriculum() instead.
    """
    skeleton = await design_curriculum(goal=goal, level=level)
    return await _enrich_skeleton(skeleton, goal=goal, level=level)


async def _enrich_skeleton(skeleton: dict, goal: str, level: str) -> dict:
    """Fill in videos and processed content for every module."""
    modules = skeleton.get("modules", [])
    topic = skeleton.get("title", goal)

    for module in modules:
        await _enrich_single_module(module, topic=topic, level=level)

    skeleton["id"] = str(uuid.uuid4())
    skeleton["goal"] = skeleton.get("goal", goal)
    skeleton["level"] = level
    return skeleton


async def _enrich_single_module(module: dict, topic: str, level: str) -> None:
    """
    Populate a single module in-place with video + processed content.
    Never raises — any failure falls back to Mwalimu teaching directly.
    """
    query = module.get("search_query") or module.get("title", "")

    videos: list[dict] = []
    try:
        videos = search_videos(query, max_results=8)
    except Exception as e:
        print(f"[curriculum_builder] search_videos failed for '{query}': {e}")

    best = select_best_video(videos, topic=module.get("title", ""), level=level)

    if best:
        module["video"] = {
            "video_id": best["video_id"],
            "title": best["title"],
            "channel_title": best["channel_title"],
            "url": best.get("url", f"https://www.youtube.com/watch?v={best['video_id']}"),
            "thumbnail_url": best.get("thumbnail_url", ""),
            "duration_seconds": best.get("duration_seconds", 0),
            "view_count": best.get("view_count", 0),
            "score": best.get("score", 0),
        }
        module["mwalimu_teaches_directly"] = False

        transcript = ""
        try:
            transcript = get_transcript(best["video_id"])
        except Exception as e:
            print(f"[curriculum_builder] transcript failed for {best['video_id']}: {e}")

        if transcript:
            try:
                content = await process_transcript_for_module(
                    transcript=transcript,
                    module_title=module.get("title", ""),
                    topic=topic,
                )
                module["content"] = content
            except Exception as e:
                print(f"[curriculum_builder] transcript processing failed: {e}")
                # Fall back to direct teaching if processing breaks
                module["content"] = await _safe_teach_directly(module, topic)
        else:
            # Video found but no transcript — have Mwalimu teach directly
            module["content"] = await _safe_teach_directly(module, topic)
    else:
        module["video"] = None
        module["mwalimu_teaches_directly"] = True
        module["content"] = await _safe_teach_directly(module, topic)


async def _safe_teach_directly(module: dict, topic: str) -> dict:
    try:
        return await _mwalimu_teach_directly(module, topic)
    except Exception as e:
        print(f"[curriculum_builder] direct teach failed: {e}")
        return _empty_module_content()


# ─────────────────────────────────────────────────────────────
# Streaming build (SSE)
# ─────────────────────────────────────────────────────────────

async def stream_build_curriculum(
    goal: str,
    level: str = "beginner",
) -> AsyncGenerator[dict, None]:
    """
    Async generator yielding progress events. Each yield is a dict
    the caller serialises into an SSE event.

    Event shapes:
      {"status": "designing", "message": "..."}
      {"status": "searching", "module": n, "module_title": "...", "message": "..."}
      {"status": "scoring",   "module": n, "message": "..."}
      {"status": "processing",   "module": n, "message": "..."}
      {"status": "module_ready", "module": n, "module_data": {...}}
      {"status": "complete",  "curriculum": {...}}
      {"status": "error",     "message": "..."}
    """
    try:
        yield {"status": "designing", "message": "Mwalimu is designing your curriculum..."}

        try:
            skeleton = await design_curriculum(goal=goal, level=level)
        except Exception as e:
            yield {"status": "error", "message": f"Failed to design curriculum: {e}"}
            return

        skeleton["id"] = str(uuid.uuid4())
        skeleton["goal"] = skeleton.get("goal", goal)
        skeleton["level"] = level

        modules = skeleton.get("modules", [])
        topic = skeleton.get("title", goal)

        yield {
            "status": "designed",
            "message": f"Curriculum designed: {len(modules)} modules",
            "skeleton": {
                "id": skeleton["id"],
                "title": skeleton.get("title", ""),
                "goal": skeleton.get("goal", goal),
                "total_weeks": skeleton.get("total_weeks", 0),
                "career_outcome": skeleton.get("career_outcome", ""),
                "modules_preview": [
                    {
                        "module_number": m.get("module_number", i + 1),
                        "title": m.get("title", ""),
                        "week": m.get("week", 1),
                        "estimated_minutes": m.get("estimated_minutes", 0),
                    }
                    for i, m in enumerate(modules)
                ],
            },
        }

        for i, module in enumerate(modules):
            num = module.get("module_number", i + 1)
            title = module.get("title", f"Module {num}")

            yield {
                "status": "searching",
                "module": num,
                "module_title": title,
                "message": f"Searching YouTube for Module {num}: {title}",
            }

            await _enrich_single_module(module, topic=topic, level=level)

            yield {
                "status": "module_ready",
                "module": num,
                "module_title": title,
                "message": f"Module {num} ready",
                "module_data": {
                    "module_number": num,
                    "title": title,
                    "week": module.get("week", 1),
                    "estimated_minutes": module.get("estimated_minutes", 0),
                    "video": module.get("video"),
                    "mwalimu_teaches_directly": module.get("mwalimu_teaches_directly", False),
                    "has_content": bool(module.get("content", {}).get("summary")),
                },
            }

            # Give the client a beat to render
            await asyncio.sleep(0.05)

        yield {
            "status": "complete",
            "message": "Your curriculum is ready!",
            "curriculum": skeleton,
        }

    except Exception as e:
        print(f"[curriculum_builder] stream build error: {e}")
        yield {"status": "error", "message": f"Something went wrong: {e}"}
