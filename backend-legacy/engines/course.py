"""
Learn4Africa — Course Generator Engine
Takes any topic and generates a complete, structured course.
"""

import json

from engines.llm import chat
from engines.mwalimu import wrap_prompt


async def generate_course_outline(
    topic: str,
    difficulty: str = "beginner",
    language: str = "en",
    age_group: str = "general",
    num_chapters: int = 5,
) -> dict:
    """
    Generate a full course outline from a topic.
    Returns structured chapter and lesson data.
    """
    age_context = {
        "child": "8-12 year old children. Use simple words, fun examples, and lots of analogies from daily life.",
        "teen": "13-17 year old teenagers. Be relatable, use modern examples, and connect topics to real-world career paths.",
        "adult": "adult learners. Be professional but accessible, focus on practical application.",
        "general": "a general audience. Be clear and universally understandable.",
    }

    engine_instructions = f"""You are designing a complete course outline.
Your courses must be:
- Deeply educational and life-changing
- Structured from simple to complex (scaffolded learning)
- Rich with real-world examples relevant to African contexts
- Practical — every chapter should have something the learner can DO
- Designed for {age_context.get(age_group, age_context['general'])}

Language: {language}
Difficulty: {difficulty}

Return only valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=topic, language=language, age_group=age_group)

    prompt = f"""Create a complete course outline on: "{topic}"

Generate exactly {num_chapters} chapters, each with 3-4 lessons.

Respond in this exact JSON format:
{{
  "title": "Course title",
  "description": "2-3 sentence course description that excites and motivates",
  "learning_outcomes": ["outcome 1", "outcome 2", "outcome 3"],
  "chapters": [
    {{
      "title": "Chapter title",
      "description": "What this chapter covers",
      "order": 1,
      "lessons": [
        {{
          "title": "Lesson title",
          "description": "One-line description",
          "key_concepts": ["concept1", "concept2"],
          "order": 1
        }}
      ]
    }}
  ]
}}"""

    response = await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.7,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
        raise ValueError("Failed to parse course outline from AI response")


async def generate_lesson_content(
    lesson_title: str,
    chapter_title: str,
    course_title: str,
    key_concepts: list[str],
    difficulty: str = "beginner",
    language: str = "en",
    age_group: str = "general",
) -> str:
    """
    Generate rich reading content for a single lesson.
    Returns Markdown-formatted lesson text.
    """
    engine_instructions = f"""You are writing a single lesson for Learn4Africa.
Write in {language}. Difficulty: {difficulty}.

Your writing must:
- Start with a hook that makes the learner curious
- Use clear headers and short paragraphs
- Include real-world examples from African contexts (markets, nature, technology, sports, music)
- Define every technical term in simple language
- Include "Think About It" boxes with reflection questions
- End with a "Key Takeaways" summary
- Be warm, encouraging, and empowering

Format: Markdown"""

    system_prompt = wrap_prompt(engine_instructions, topic=course_title, language=language, age_group=age_group)

    prompt = f"""Write the full lesson content for:

Course: {course_title}
Chapter: {chapter_title}
Lesson: {lesson_title}
Key concepts to cover: {', '.join(key_concepts)}

Write a comprehensive, engaging lesson (800-1200 words)."""

    return await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.7,
    )
