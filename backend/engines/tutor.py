"""
Learn4Africa — Mwalimu AI Tutor Engine
"Mwalimu" means "teacher" in Swahili.

A personal AI tutor that:
- Adapts to the learner's age, language, and learning style
- Detects when the learner is struggling and switches approach
- Uses the Socratic method — guides discovery, doesn't just give answers
- Speaks warmly and encouragingly, like a patient older sibling
"""

import json

from engines.llm import chat
from engines.mwalimu import MWALIMU_SYSTEM, get_cultural_context, get_encouragement


TUTOR_CONTEXT_TEMPLATE = """## Current Learner Context
- Name: {learner_name}
- Age group: {age_group}
- Language preference: {language}
- Learning style: {learning_style}
- Current topic: {current_topic}
- Difficulty level: {difficulty}
- Cultural grounding for this topic: {cultural_context}

## Teaching Rules for This Chat
- Use the Socratic method: ask guiding questions instead of giving answers directly
- NEVER give the answer directly to quiz/exercise questions — guide the learner to discover it
- If the learner seems frustrated, acknowledge their feelings first, then simplify
- Use their preferred language when possible, mixing in English for technical terms
- Keep responses concise — children lose attention with long paragraphs
- End messages with encouragement or a thought-provoking question
- Naturally use encouragement in the learner's language: {encouragement_examples}
"""


async def tutor_chat(
    user_message: str,
    conversation_history: list[dict],
    learner_name: str = "Friend",
    age_group: str = "general",
    language: str = "en",
    learning_style: str = "visual",
    current_topic: str = "",
    difficulty: str = "beginner",
) -> str:
    """
    Send a message to Mwalimu and get a personalized response.
    """
    context = TUTOR_CONTEXT_TEMPLATE.format(
        learner_name=learner_name,
        age_group=age_group,
        language=language,
        learning_style=learning_style,
        current_topic=current_topic or "General learning",
        difficulty=difficulty,
        cultural_context=get_cultural_context(current_topic or ""),
        encouragement_examples=", ".join(f'"{p}"' for p in get_encouragement(language)),
    )
    system = f"{MWALIMU_SYSTEM}\n\n{context}"

    messages = conversation_history + [{"role": "user", "content": user_message}]
    response = await chat(messages, system_prompt=system, temperature=0.8)
    return response


async def detect_struggle(conversation_history: list[dict]) -> dict:
    """
    Analyze the conversation to detect if the learner is struggling.
    Returns a recommendation for format switching or topic simplification.
    """
    if len(conversation_history) < 3:
        return {"struggling": False}

    analysis_prompt = """Analyze this learning conversation. Is the learner struggling?

Look for signs:
- Repeated wrong answers
- "I don't understand" or similar phrases
- Short, disengaged responses
- Long gaps or frustration language

Respond in JSON:
{
  "struggling": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "recommendation": "switch_to_visual" | "simplify_topic" | "take_break" | "try_game" | "continue"
}"""

    messages = [
        {"role": "user", "content": f"Conversation to analyze:\n{json.dumps(conversation_history[-6:])}\n\n{analysis_prompt}"}
    ]

    response = await chat(messages, temperature=0.3)

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"struggling": False, "recommendation": "continue"}
