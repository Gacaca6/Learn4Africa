"""
Learn4Africa — Quiz Generator Engine
Generates multiple question types from lesson content.
"""

import json

from engines.llm import chat
from engines.mwalimu import wrap_prompt


async def generate_quiz(
    lesson_content: str,
    num_questions: int = 8,
    difficulty: str = "beginner",
    language: str = "en",
    age_group: str = "general",
) -> list[dict]:
    """
    Generate a quiz with mixed question types.
    Types: multiple_choice, true_false, fill_blank, short_answer, matching
    """
    engine_instructions = f"""You are designing a quiz that helps learners understand, not memorize.
Language: {language}. Level: {difficulty}.

Rules:
- Questions should test understanding, not just memorization
- Include a mix of question types
- Every question must have a clear, unambiguous correct answer
- Include an explanation for why the answer is correct (this helps learners LEARN from mistakes)
- Difficulty should gradually increase through the quiz
- Return ONLY valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=lesson_content[:200], language=language, age_group=age_group)

    prompt = f"""Create a quiz with exactly {num_questions} questions from this content:

{lesson_content}

Use a mix of these types:
- multiple_choice (4 options, one correct)
- true_false
- fill_blank (sentence with ___ for the missing word)
- short_answer (1-2 sentence answer expected)

Respond in this exact JSON format:
[
  {{
    "type": "multiple_choice",
    "question": "The question text",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "A",
    "explanation": "Why this is correct",
    "points": 10
  }},
  {{
    "type": "true_false",
    "question": "Statement to evaluate",
    "correct_answer": "true",
    "explanation": "Why this is true/false",
    "points": 5
  }},
  {{
    "type": "fill_blank",
    "question": "The ___ is the powerhouse of the cell.",
    "correct_answer": "mitochondria",
    "explanation": "The mitochondria generates ATP energy",
    "points": 10
  }},
  {{
    "type": "short_answer",
    "question": "Explain in your own words...",
    "correct_answer": "Expected key points in the answer",
    "explanation": "A complete explanation",
    "points": 15
  }}
]"""

    response = await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.5,
    )

    try:
        questions = json.loads(response)
    except json.JSONDecodeError:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start != -1 and end > start:
            questions = json.loads(response[start:end])
        else:
            raise ValueError("Failed to parse quiz")

    return questions


async def grade_short_answer(
    question: str,
    expected_answer: str,
    student_answer: str,
    language: str = "en",
) -> dict:
    """
    Use AI to grade a short answer question.
    Returns score (0-100) and feedback.
    """
    prompt = f"""Grade this student's answer.

Question: {question}
Expected answer: {expected_answer}
Student's answer: {student_answer}

Respond in JSON:
{{
  "score": 0-100,
  "feedback": "Encouraging feedback explaining what was right and what could be improved",
  "key_points_hit": ["point1", "point2"],
  "key_points_missed": ["point1"]
}}

Be generous and encouraging — the goal is learning, not punishment.
Grade in {language}."""

    response = await chat(
        [{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"score": 50, "feedback": "Thank you for your answer! Keep learning."}
