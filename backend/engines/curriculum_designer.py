"""
Learn4Africa — Curriculum Designer

Uses Mwalimu (via the LLM chat client) to design a structured,
multi-week learning curriculum from a student goal. This only
designs the skeleton — actual videos are found later by the
curriculum builder.
"""

import json
import re

from engines.llm import chat
from engines.mwalimu import MWALIMU_SYSTEM, get_cultural_context


async def design_curriculum(
    goal: str,
    level: str = "beginner",
    target_weeks: int = 6,
) -> dict:
    """
    Design a curriculum skeleton for the student's goal.
    Returns a structured dict with modules, each containing a YouTube
    search_query that will be used to find the best real video.
    """
    cultural_context = get_cultural_context(goal)

    system_prompt = f"""{MWALIMU_SYSTEM}

## Current Task
You are designing a complete learning curriculum for a student in Africa.
Cultural grounding: {cultural_context}

Return ONLY valid JSON — no prose before or after, no markdown fences.
Use double quotes for all keys and string values."""

    user_prompt = f"""A student in Africa wants to: {goal}
Their current level: {level}

Design a {target_weeks}-week learning curriculum.

Return ONLY valid JSON in this exact structure:
{{
  "title": "curriculum title",
  "goal": "what the student will achieve",
  "total_weeks": {target_weeks},
  "career_outcome": "job title they can aim for",
  "modules": [
    {{
      "module_number": 1,
      "title": "module title",
      "description": "what this module covers",
      "search_query": "exact YouTube search query to find the best video for this",
      "learning_objectives": ["objective 1", "objective 2", "objective 3"],
      "estimated_minutes": 45,
      "week": 1
    }}
  ]
}}

Design 6-10 modules total. Make search_query VERY specific and optimised
for finding high-quality beginner YouTube tutorials. Include channel hints
or keywords like "full tutorial", "crash course", "freeCodeCamp", "for beginners"
when appropriate.

Example good search_query: "Python for beginners full tutorial freeCodeCamp"
Example bad search_query: "Python tutorial"

Every module must build on the previous one. Start very simple, scaffold up."""

    response = await chat(
        [{"role": "user", "content": user_prompt}],
        system_prompt=system_prompt,
        temperature=0.6,
        max_tokens=4096,
    )

    return _parse_curriculum_json(response)


def _parse_curriculum_json(raw: str) -> dict:
    """
    Parse the LLM's curriculum response, tolerating common LLM quirks:
    trailing commas, markdown code fences, prose before/after the JSON.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Extract the outermost {...} block
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        raise ValueError(f"Failed to parse curriculum JSON: no object found in response")

    chunk = text[start:end]

    # Remove trailing commas before } or ]
    chunk = re.sub(r",\s*([}\]])", r"\1", chunk)

    try:
        return json.loads(chunk)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse curriculum JSON: {e}") from e
