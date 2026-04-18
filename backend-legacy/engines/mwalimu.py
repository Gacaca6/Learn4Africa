"""
Learn4Africa — Mwalimu African Intelligence Layer

The cultural wrapper that makes every AI response feel like it comes from
a wise, caring African teacher. "Mwalimu" means "teacher" in Swahili.

This module provides:
1. MWALIMU_SYSTEM — the base system prompt for all AI interactions
2. wrap_prompt() — wraps any engine prompt with African cultural grounding
3. get_cultural_context() — returns topic-relevant African context
"""

MWALIMU_SYSTEM = """You are Mwalimu — a warm, wise, and patient AI tutor built for African learners.

## Who You Are
- Your name means "Teacher" in Swahili. You carry that responsibility with pride.
- You teach with the warmth of a favourite uncle or auntie — firm but never harsh.
- You believe every child can learn anything if it's explained the right way.
- You use African proverbs, examples, and references naturally (not forced).
- You celebrate effort, not just correctness.

## How You Teach
- **Start simple, build up.** Always begin with what the learner already knows.
- **Use local examples.** A lesson about electricity? Talk about solar panels in Kigali.
  A lesson about economics? Reference M-Pesa, Village Savings Groups, or market traders.
- **Mix languages naturally.** If the learner speaks Swahili, sprinkle in "Sawa?", "Vizuri sana!", "Twende!".
  For Kinyarwanda learners, use "Yego!", "Komeza!", "Murakoze!". Match the learner's language.
- **Use stories.** African oral tradition is powerful. When explaining a concept, wrap it in a short story
  featuring relatable characters — a student in Nairobi, a farmer in Butare, a coder in Lagos.
- **Encourage constantly.** "You're getting closer!", "That's a smart question!", "Even professors
  started where you are now."

## Your Boundaries
- You NEVER shame a learner for not knowing something.
- You NEVER use examples that assume Western contexts (snow, Thanksgiving, etc.) unless the course requires it.
- You NEVER give up on explaining. If one approach doesn't work, try another format:
  analogy, story, diagram description, song, or game.
- You are honest when you don't know something: "I'm not sure about that, but let's figure it out together."
- You keep content age-appropriate. For children (8-12), use simpler words and more stories.
  For teens (13-17), be engaging and slightly challenging. For adults, be direct and practical.
- You respect all cultures, religions, and traditions across Africa.

## Your Personality
- Patient. Always patient.
- Encouraging but honest — you don't pretend wrong answers are right.
- Curious — you model the love of learning.
- Humble — you learn from learners too.
- Occasionally funny — a well-timed joke or proverb keeps things light.

## African Proverbs You Use
(Use sparingly and only when relevant)
- "If you want to go fast, go alone. If you want to go far, go together." — African proverb
- "Knowledge is like a garden: if it is not cultivated, it cannot be harvested." — Guinean proverb
- "However long the night, the dawn will break." — African proverb
- "The child who asks questions does not lose their way." — Akan proverb
- "Sticks in a bundle are unbreakable." — Bondei proverb
"""


# Language-specific encouragement phrases
ENCOURAGEMENT = {
    "en": ["Great thinking!", "You're making real progress!", "Keep going — you've got this!"],
    "sw": ["Vizuri sana!", "Unaendelea vizuri!", "Endelea — unaweza!"],
    "fr": ["Excellent travail!", "Tu fais de vrais progres!", "Continue comme ca!"],
    "ha": ["Da kyau sosai!", "Kana ci gaba!", "Ka ci gaba — za ka iya!"],
    "yo": ["O se daradara!", "O n ni ilowosi gidi!", "Tẹsiwaju — o le se e!"],
    "am": ["በጣም ጥሩ!", "እድገት እያሳየህ ነው!", "ቀጥል — ትችላለህ!"],
    "ar": ["عمل رائع!", "أنت تحرز تقدمًا حقيقيًا!", "استمر — يمكنك ذلك!"],
    "rw": ["Byiza cyane!", "Urimo utera imbere!", "Komeza — ubishoboye!"],
    "zu": ["Kuhle kakhulu!", "Uyathuthuka ngempela!", "Qhubeka — ungakwenza!"],
    "ig": ["Ọ dị mma nke ukwuu!", "Ị na-aga n'ihu!", "Gaa n'ihu — ị nwere ike ime ya!"],
}


# African context examples by topic area
CULTURAL_CONTEXTS = {
    "technology": "Reference Kigali Innovation City, iHub Nairobi, Andela, M-Pesa innovation, and Africa's mobile-first tech revolution.",
    "science": "Use examples from African biodiversity (Serengeti, Congo rainforest), African space programs (Ethiopia, Nigeria, Rwanda), and traditional knowledge systems.",
    "health": "Reference Rwanda's community health worker model (the best in the world), traditional medicine alongside modern science, and MOH Rwanda's digital health innovations.",
    "finance": "Use M-Pesa, Village Savings (tontines/chamas), SACCOs, and African entrepreneurship stories. Reference Rwanda's ease-of-doing-business ranking.",
    "history": "Centre African civilizations: Great Zimbabwe, Axum, Mali Empire, Benin Kingdom, Buganda, the Swahili Coast. Challenge 'Africa has no history' narratives.",
    "environment": "Reference the Green Belt Movement (Wangari Maathai), Rwanda's plastic bag ban (first in the world), Lake Victoria ecosystem, African renewable energy leadership.",
    "arts": "Reference Nollywood, Afrobeats, African literary traditions (Chinua Achebe, Ngugi wa Thiong'o), and the rich oral storytelling traditions across the continent.",
    "default": "Ground examples in African daily life: markets, community gatherings, family structures, and the Ubuntu philosophy of shared humanity.",
}


def get_cultural_context(topic: str) -> str:
    """Return African cultural context hints relevant to a topic."""
    topic_lower = topic.lower()
    for key, context in CULTURAL_CONTEXTS.items():
        if key in topic_lower:
            return context
    # Check for keyword matches
    if any(w in topic_lower for w in ["code", "programming", "software", "ai", "data", "computer", "web", "app"]):
        return CULTURAL_CONTEXTS["technology"]
    if any(w in topic_lower for w in ["biology", "chemistry", "physics", "energy", "solar", "math"]):
        return CULTURAL_CONTEXTS["science"]
    if any(w in topic_lower for w in ["health", "nutrition", "medical", "disease", "body"]):
        return CULTURAL_CONTEXTS["health"]
    if any(w in topic_lower for w in ["money", "business", "finance", "economy", "trade", "market"]):
        return CULTURAL_CONTEXTS["finance"]
    if any(w in topic_lower for w in ["history", "kingdom", "empire", "colonial", "independence"]):
        return CULTURAL_CONTEXTS["history"]
    return CULTURAL_CONTEXTS["default"]


def wrap_prompt(engine_prompt: str, topic: str = "", language: str = "en", age_group: str = "teen") -> str:
    """
    Wrap any engine-specific system prompt with the Mwalimu cultural layer.
    This should be prepended to system prompts in course.py, flashcards.py, quiz.py, etc.
    """
    cultural_context = get_cultural_context(topic)

    age_instruction = {
        "child": "The learner is a child (8-12). Use very simple language, lots of stories, and be extra encouraging.",
        "teen": "The learner is a teenager (13-17). Be engaging, slightly challenging, and relatable.",
        "adult": "The learner is an adult (18+). Be direct, practical, and respect their time.",
    }.get(age_group, "Adapt to the learner's level.")

    return f"""{MWALIMU_SYSTEM}

## Current Context
- Topic area: {topic or 'General'}
- Language: {language}
- Cultural grounding: {cultural_context}
- {age_instruction}

## Your Task (Engine-Specific Instructions)
{engine_prompt}"""


def get_encouragement(language: str = "en") -> list[str]:
    """Return encouragement phrases in the learner's language."""
    return ENCOURAGEMENT.get(language, ENCOURAGEMENT["en"])


# ---------------------------------------------------------------------------
# Module Explanation Engine
# ---------------------------------------------------------------------------

MWALIMU_MODULE_PROMPT = """You are Mwalimu, explaining a specific learning module to an African student.

The student has just opened this module. Your job is to make them feel like a real human mentor is sitting next to them, explaining why this matters for THEIR life.

Write a 6-part explanation in this exact structure (use markdown headings):

## 1. The African Hook
Start with a SPECIFIC scene from African life (a market trader in Kigali, a student in Kampala, a farmer in Arusha). Make it real. 2-3 sentences. No definitions yet.

## 2. What You Are About to Learn
Explain the core concept in plain language — no jargon. If a 15-year-old in Butare could not explain it back in one sentence, simplify more. 3-4 sentences.

## 3. A Concrete Example From Home
Use a local analogy. Compare the concept to something the student already knows from Africa: mobile money, umuganda, matatus, MoMo, Irembo, a market stall, a SACCO. Show — do not tell. 4-5 sentences.

## 4. How This Connects to Your Practice Exercise
Preview the practice exercise. Tell them what they will build and why it matters. Get them excited to try it. 3-4 sentences.

## 5. Why Interviewers Care
Tell them a real story about how this exact concept shows up in job interviews. What will employers ask? What answer wins? 3-4 sentences.

## 6. A Word of Encouragement
End with warmth. Use their name if given. Use a short proverb or local phrase. Remind them that every expert was once a beginner. 2-3 sentences.

Rules:
- NEVER start with 'In this module...' — boring.
- NEVER use Western examples (no Starbucks, no Thanksgiving, no American dollars).
- Use the student's name if provided.
- Match the student's language.
- Keep total length around 500-700 words. Long enough to matter, short enough to read."""


async def build_module_explanation(
    module_data: dict,
    student_name: str = "",
    language: str = "en",
) -> str:
    """
    Generate a warm, contextual African-first explanation of a module.

    This is the Layer 1 ("WHY THIS MATTERS") content for the 5-Layer Module Standard.
    Takes a module dict (from a track JSON file) and produces markdown that
    walks the student from "what is this?" to "why do I care?" to "what's next?".

    Args:
        module_data: The module dict from a track JSON file. Expected keys:
            title, why_africa, concepts (list), practice_exercise (dict),
            interview_questions (list), portfolio_contribution (optional)
        student_name: Optional student name for personalisation.
        language: ISO 639-1 language code (en, sw, rw, fr, etc.)

    Returns:
        Markdown string with 6 sections ready to render on the Learning Room "Why This Matters" tab.
    """
    from engines.llm import chat  # lazy import to avoid circular dependency

    # Pull the pieces
    title = module_data.get("title", "this module")
    why_africa = module_data.get("why_africa", "")
    concepts = module_data.get("concepts", []) or []
    concepts_text = "\n".join(f"- {c}" for c in concepts) if concepts else "(none listed)"

    practice = module_data.get("practice_exercise") or {}
    practice_title = practice.get("title", "")
    practice_instructions = practice.get("instructions", "")

    interview_questions = module_data.get("interview_questions", []) or []
    first_interview_q = ""
    if interview_questions:
        first_interview_q = interview_questions[0].get("question", "")

    portfolio = module_data.get("portfolio_contribution", "")

    # Build the user message with all the context
    student_line = f"The student's name is {student_name}. Greet them by name." if student_name else "The student has not shared their name yet."

    user_message = f"""Here is the module you are explaining:

**Module Title:** {title}

**Why This Matters for Africa (raw context from the curriculum):**
{why_africa}

**Concepts the student will learn:**
{concepts_text}

**Hands-on practice exercise they will do next:**
Title: {practice_title}
Instructions: {practice_instructions}

**First interview question from this module:**
{first_interview_q or '(none)'}

**Portfolio contribution:**
{portfolio or '(none)'}

**Student context:**
{student_line}
Preferred language: {language}

Now write the 6-part module explanation following the structure exactly. Ground everything in African daily life. Make the student feel seen, capable, and excited to start."""

    system = wrap_prompt(
        MWALIMU_MODULE_PROMPT,
        topic=title,
        language=language,
        age_group="adult",
    )

    response = await chat(
        messages=[{"role": "user", "content": user_message}],
        system_prompt=system,
        temperature=0.75,
        max_tokens=1500,
    )

    return response.strip()


# ---------------------------------------------------------------------------
# Personalised greetings (uses the user's mwalimu_context memory)
# ---------------------------------------------------------------------------


def build_personalized_greeting(user: dict) -> str:
    """
    Build a warm, context-aware welcome line for a returning learner.

    Looks at the user's mwalimu_context (last module, weak areas,
    total_sessions) and produces a short 1-2 sentence greeting that
    feels like a real mentor remembering you.

    This is deterministic (no LLM call) so it can be shown instantly on
    the dashboard before the chat stream has even started.

    Args:
        user: The full Mongo user document (not the sanitised public view).

    Returns:
        A ready-to-render greeting string.
    """
    if not user:
        return "Karibu! Welcome to Learn4Africa."

    name = (user.get("name") or "").split(" ")[0] or "rafiki"
    context = user.get("mwalimu_context") or {}
    last_module = context.get("last_module_title") or ""
    weak_areas = context.get("weak_areas") or []
    total_sessions = int(context.get("total_sessions") or 0)
    language = user.get("preferred_language") or "en"

    hello = {
        "en": "Welcome back",
        "sw": "Karibu tena",
        "rw": "Murakaza neza",
        "fr": "Ravi de te revoir",
        "ha": "Barka da dawowa",
        "yo": "E ku aabo",
    }.get(language, "Welcome back")

    parts: list[str] = [f"{hello}, {name}."]

    if last_module:
        parts.append(f"Last time we were working on **{last_module}**.")
    elif total_sessions == 0:
        parts.append("Nimefurahi kukutana nawe — I'm Mwalimu, your tutor. Ready to begin?")

    if weak_areas:
        tricky = weak_areas[0]
        parts.append(f"Let's sharpen **{tricky}** today — I'll walk with you step by step.")
    elif total_sessions >= 3:
        parts.append("You're building real momentum. Hatua kwa hatua — step by step.")

    return " ".join(parts)
