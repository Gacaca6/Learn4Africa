"""
Learn4Africa — Flashcard Generator Engine
Generates spaced-repetition flashcards from lesson content.
"""

import json

from engines.llm import chat
from engines.mwalimu import wrap_prompt


async def generate_flashcards(
    lesson_content: str,
    num_cards: int = 10,
    difficulty: str = "beginner",
    language: str = "en",
) -> list[dict]:
    """
    Generate flashcards from lesson content.
    Returns list of {front, back, hint, difficulty} objects.
    """
    engine_instructions = f"""You are designing spaced-repetition flashcards.
Language: {language}. Level: {difficulty}.

Rules:
- Front: A clear, specific question or prompt
- Back: A concise, accurate answer
- Hint: A small clue that guides without giving the answer away
- Test ONE concept per card — never combine multiple ideas
- Use simple, clear language
- Include a mix of: definitions, concepts, applications, and examples
- Return ONLY valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=lesson_content[:200], language=language)

    prompt = f"""Create exactly {num_cards} flashcards from this lesson content:

{lesson_content}

Respond in this exact JSON format:
[
  {{
    "front": "Question or prompt",
    "back": "Answer",
    "hint": "A small helpful clue",
    "difficulty": "easy|medium|hard"
  }}
]"""

    response = await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.5,
    )

    try:
        cards = json.loads(response)
    except json.JSONDecodeError:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start != -1 and end > start:
            cards = json.loads(response[start:end])
        else:
            raise ValueError("Failed to parse flashcards")

    return cards


def calculate_next_review(card_id: str, quality: int, history: dict) -> dict:
    """
    SM-2 spaced repetition algorithm.
    Quality: 0 (total blank) to 5 (perfect recall)
    Returns updated schedule with next review date.
    """
    easiness = history.get("easiness", 2.5)
    interval = history.get("interval", 1)
    repetitions = history.get("repetitions", 0)

    if quality >= 3:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * easiness)
        repetitions += 1
    else:
        repetitions = 0
        interval = 1

    easiness = max(1.3, easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    return {
        "card_id": card_id,
        "easiness": easiness,
        "interval": interval,
        "repetitions": repetitions,
        "next_review_days": interval,
    }
