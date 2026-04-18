"""
Learn4Africa — Career Track Routes

Hand-crafted career tracks live in backend/data/tracks/*.json.
These are NOT AI-generated at runtime — they are carefully curated
by humans to give every African student a proven path to employment.

Endpoints:
    GET  /api/tracks                                          → list all tracks (summary)
    GET  /api/tracks/{track_id}                               → full track detail
    GET  /api/tracks/{track_id}/modules/{module_number}       → single module detail
    POST /api/tracks/{track_id}/modules/{module_number}/explain         → Mwalimu WHY explanation (LLM)
    POST /api/tracks/{track_id}/modules/{module_number}/quiz            → AI-generated quick quiz
    POST /api/tracks/{track_id}/modules/{module_number}/practice-guide  → step-by-step practice walkthrough
    GET  /api/tracks/{track_id}/modules/{module_number}/resources       → extra links & context
"""

import json
import uuid
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from engines.auth_engine import require_auth
from engines.llm import chat
from engines.mwalimu import build_module_explanation, wrap_prompt
from models.mongo import users_collection
from utils.time import now_utc
from models.user import serialize_user

router = APIRouter()

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

TRACKS_DIR = Path(__file__).resolve().parent.parent / "data" / "tracks"
AFRICA_CONTEXT_PATH = Path(__file__).resolve().parent.parent / "data" / "africa_context.json"


def _safe_slug(slug: str) -> str:
    return slug.replace("/", "").replace("\\", "").replace("..", "").strip()


@lru_cache(maxsize=32)
def _load_track(track_id: str) -> dict[str, Any]:
    slug = _safe_slug(track_id)
    path = TRACKS_DIR / f"{slug}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Track '{track_id}' not found")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _load_africa_context() -> dict[str, Any]:
    if not AFRICA_CONTEXT_PATH.exists():
        return {}
    with AFRICA_CONTEXT_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _get_module(track: dict, module_number: int) -> dict:
    for m in track.get("modules", []):
        if int(m.get("module_number", -1)) == int(module_number):
            return m
    raise HTTPException(
        status_code=404,
        detail=f"Module {module_number} not found in track '{track.get('id')}'",
    )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class ExplainRequest(BaseModel):
    student_name: Optional[str] = ""
    language: Optional[str] = "en"


class QuizRequest(BaseModel):
    num_questions: int = 5
    language: Optional[str] = "en"


class PracticeGuideRequest(BaseModel):
    student_name: Optional[str] = ""
    language: Optional[str] = "en"


class InterviewMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class InterviewRequest(BaseModel):
    message: str
    conversation_history: list[InterviewMessage] = []
    student_name: Optional[str] = ""
    language: Optional[str] = "en"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("")
@router.get("/")
async def list_tracks():
    """
    List all available career tracks with summary data.
    Used by the /tracks selection page on the frontend.
    """
    if not TRACKS_DIR.exists():
        return {"tracks": []}

    tracks: list[dict[str, Any]] = []
    for path in sorted(TRACKS_DIR.glob("*.json")):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            tracks.append(
                {
                    "id": data.get("id"),
                    "title": data.get("title"),
                    "tagline": data.get("tagline"),
                    "duration_weeks": data.get("duration_weeks"),
                    "estimated_weekly_hours": data.get("estimated_weekly_hours"),
                    "difficulty": data.get("difficulty"),
                    "module_count": len(data.get("modules", [])),
                    "target_jobs": data.get("target_jobs", []),
                    "capstone_project": data.get("capstone_project", ""),
                }
            )
        except Exception:
            # Skip malformed files silently — do not break the whole list
            continue

    return {"tracks": tracks, "count": len(tracks)}


@router.get("/{track_id}")
async def get_track(track_id: str):
    """Return full details for a single track, including all modules."""
    track = _load_track(track_id)
    return track


@router.get("/{track_id}/modules/{module_number}")
async def get_module(track_id: str, module_number: int):
    """Return a single module from a track."""
    track = _load_track(track_id)
    module = _get_module(track, module_number)

    # Return module + minimal track context (title, id, total modules)
    return {
        "track_id": track.get("id"),
        "track_title": track.get("title"),
        "total_modules": len(track.get("modules", [])),
        "module": module,
    }


@router.post("/{track_id}/modules/{module_number}/explain")
async def explain_module(track_id: str, module_number: int, req: ExplainRequest):
    """
    LAYER 1 — WHY THIS MATTERS.
    Generate Mwalimu's warm, African-grounded explanation of why this module
    matters for the student's life and future job.
    """
    track = _load_track(track_id)
    module = _get_module(track, module_number)

    explanation = await build_module_explanation(
        module_data=module,
        student_name=req.student_name or "",
        language=req.language or "en",
    )

    return {
        "track_id": track.get("id"),
        "module_number": module_number,
        "module_title": module.get("title"),
        "explanation_markdown": explanation,
    }


@router.post("/{track_id}/modules/{module_number}/quiz")
async def quiz_module(track_id: str, module_number: int, req: QuizRequest):
    """
    Generate a short quick-check quiz for the module.
    Returns 5 multiple-choice questions grounded in the module's concepts.
    """
    track = _load_track(track_id)
    module = _get_module(track, module_number)

    title = module.get("title", "")
    concepts = module.get("concepts", []) or []
    concepts_text = "\n".join(f"- {c}" for c in concepts) if concepts else "(none)"
    num = max(3, min(10, int(req.num_questions or 5)))

    engine_prompt = f"""Create a {num}-question multiple-choice quiz for an African student who just finished this module.

Module title: {title}
Concepts covered:
{concepts_text}

Requirements:
- Each question has exactly 4 options (A, B, C, D).
- Exactly one correct answer per question.
- Ground at least 2 questions in African contexts (Kigali, Mobile Money, a Rwandan business, etc.).
- Include a short explanation for each correct answer.
- Return ONLY valid JSON. No prose, no markdown, no code fences.

Return this exact JSON shape:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["A option", "B option", "C option", "D option"],
      "correct_index": 0,
      "explanation": "string"
    }}
  ]
}}"""

    system = wrap_prompt(
        engine_prompt,
        topic=title,
        language=req.language or "en",
        age_group="adult",
    )

    try:
        raw = await chat(
            messages=[{"role": "user", "content": f"Generate the {num}-question quiz now."}],
            system_prompt=system,
            temperature=0.6,
            max_tokens=2000,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}") from exc

    # Try to parse the JSON — strip code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        # Drop potential leading "json\n"
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find the first '{' ... last '}'
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                parsed = json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=500,
                    detail="Quiz generator returned invalid JSON",
                )
        else:
            raise HTTPException(
                status_code=500,
                detail="Quiz generator returned invalid JSON",
            )

    return {
        "track_id": track.get("id"),
        "module_number": module_number,
        "module_title": title,
        "quiz": parsed,
    }


@router.post("/{track_id}/modules/{module_number}/practice-guide")
async def practice_guide(track_id: str, module_number: int, req: PracticeGuideRequest):
    """
    LAYER 3 — HANDS-ON PRACTICE assistant.
    Walk the student through the practice exercise step by step,
    encouraging them and anticipating where they will get stuck.
    """
    track = _load_track(track_id)
    module = _get_module(track, module_number)
    practice = module.get("practice_exercise") or {}

    if not practice:
        raise HTTPException(
            status_code=404,
            detail="This module has no practice exercise",
        )

    title = practice.get("title", "the practice exercise")
    instructions = practice.get("instructions", "")

    student_line = (
        f"The student's name is {req.student_name}. Greet them by name."
        if req.student_name
        else "The student has not shared their name yet."
    )

    engine_prompt = """You are walking an African student through a hands-on practice exercise.

Write a step-by-step practice guide that:
1. Starts with 2 sentences of encouragement (you believe in them).
2. Breaks the exercise into 4-7 numbered steps. Each step must be doable in 10-20 minutes.
3. For each step, include: what to do, a concrete hint, and a "what to watch out for" warning.
4. Lists 3 common mistakes students make and how to avoid them.
5. Ends with "How to know you're done" — the checklist.

Use markdown. Use African examples where possible. Keep the tone warm but focused."""

    user_message = f"""Module: {module.get('title')}

Practice exercise title: {title}

Practice instructions (raw):
{instructions}

Student context:
{student_line}
Language: {req.language or 'en'}

Write the step-by-step practice guide now."""

    system = wrap_prompt(
        engine_prompt,
        topic=module.get("title", ""),
        language=req.language or "en",
        age_group="adult",
    )

    try:
        guide = await chat(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=system,
            temperature=0.7,
            max_tokens=1800,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}") from exc

    return {
        "track_id": track.get("id"),
        "module_number": module_number,
        "module_title": module.get("title"),
        "practice_title": title,
        "guide_markdown": guide.strip(),
    }


@router.post("/{track_id}/modules/{module_number}/interview")
async def mock_interview(track_id: str, module_number: int, req: InterviewRequest):
    """
    LAYER 4 — LIVE MOCK INTERVIEW.
    Mwalimu plays the role of a warm but professional African tech interviewer.
    Asks one question at a time, waits for the student's answer, then:
      - Gives short, honest feedback (what was strong, what was missing).
      - Asks a follow-up or moves to the next question.
    After roughly 5-6 exchanges, Mwalimu wraps up with a short assessment.
    """
    track = _load_track(track_id)
    module = _get_module(track, module_number)

    title = module.get("title", "")
    concepts = module.get("concepts", []) or []
    concepts_text = "\n".join(f"- {c}" for c in concepts) if concepts else "(none listed)"

    interview_questions = module.get("interview_questions", []) or []
    q_bank = "\n".join(
        f"Q: {q.get('question', '')}\nModel answer (for your reference only, do not read it to the student):\n{q.get('model_answer', '')}\n---"
        for q in interview_questions
    ) or "(no pre-written questions — make them up based on the concepts)"

    student_line = (
        f"The candidate's name is {req.student_name}."
        if req.student_name
        else "The candidate's name is not shared yet — you can ask for it on your first turn."
    )

    engine_prompt = f"""You are Mwalimu, conducting a LIVE mock job interview with an African student.

You are simulating the interviewer for an entry-level role connected to this module.

Module title: {title}
Module concepts:
{concepts_text}

Question bank for this module (use as inspiration — mix and ask your own too):
{q_bank}

## How You Run This Interview
- Be warm but professional — like a senior engineer at Andela or a manager at Bank of Kigali.
- Ask ONE question at a time. Never dump multiple questions in one turn.
- Wait for the candidate's response, then give 2-3 sentences of honest feedback:
  - What was strong (be specific).
  - What was missing or could be sharper.
- Then ask the next question (or a follow-up).
- Mix technical and behavioural questions. Include at least one "tell me about a time" question.
- After 5-6 total exchanges, wrap up with a short assessment:
  - A score out of 10
  - 2-3 things the candidate did well
  - 1-2 things to improve before their real interview
  - A warm closing encouragement
- Never give away model answers unless asked specifically.
- Never lecture — you are interviewing, not teaching.

## Candidate Context
{student_line}
Preferred language: {req.language or 'en'}

Start the interview on your first turn with a warm greeting, your role as the interviewer, and your first question."""

    system = wrap_prompt(
        engine_prompt,
        topic=title,
        language=req.language or "en",
        age_group="adult",
    )

    # Build the message list
    history_messages = [
        {"role": m.role, "content": m.content}
        for m in req.conversation_history
        if m.role in ("user", "assistant")
    ]
    history_messages.append({"role": "user", "content": req.message})

    try:
        response = await chat(
            messages=history_messages,
            system_prompt=system,
            temperature=0.8,
            max_tokens=1200,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}") from exc

    return {
        "track_id": track.get("id"),
        "module_number": module_number,
        "module_title": title,
        "response": response.strip(),
    }


# ---------------------------------------------------------------------------
# Progress sync (require auth)
# ---------------------------------------------------------------------------


class StartTrackRequest(BaseModel):
    make_active: bool = True


class CompleteModuleRequest(BaseModel):
    completion_percentage: Optional[float] = None


class QuizScoreRequest(BaseModel):
    score: int = Field(..., ge=0, le=100)


class PortfolioAddRequest(BaseModel):
    module_number: int
    project_name: str
    description: str = ""
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    tech_stack: list[str] = Field(default_factory=list)
    is_featured: bool = False


def _empty_track_progress(track_id: str) -> dict[str, Any]:
    now = now_utc()
    return {
        "track_id": track_id,
        "started_at": now,
        "last_active": now,
        "current_module": 1,
        "completed_modules": [],
        "quiz_scores": {},
        "practice_completed": [],
        "interview_practiced": [],
        "completion_percentage": 0.0,
        "completed_at": None,
    }


def _require_mongo():
    users = users_collection()
    if users is None:
        raise HTTPException(
            status_code=503,
            detail="Progress sync requires MongoDB, which is not configured.",
        )
    return users


def _ensure_track_progress(user_doc: dict, track_id: str) -> dict[str, Any]:
    progress_map = user_doc.get("tracks_progress") or {}
    if track_id not in progress_map:
        progress_map[track_id] = _empty_track_progress(track_id)
        user_doc["tracks_progress"] = progress_map
    return progress_map[track_id]


@router.post("/{track_id}/start")
async def start_track(
    track_id: str,
    req: StartTrackRequest,
    user: dict[str, Any] = Depends(require_auth),
):
    """Mark a track as started for the current user."""
    users = _require_mongo()
    track = _load_track(track_id)

    progress = _ensure_track_progress(user, track_id)
    progress["last_active"] = now_utc()

    updates: dict[str, Any] = {
        f"tracks_progress.{track_id}": progress,
        "updated_at": now_utc(),
    }
    if req.make_active:
        updates["active_track_id"] = track_id

    await users.update_one({"_id": user["_id"]}, {"$set": updates})
    return {
        "ok": True,
        "track_id": track.get("id"),
        "progress": progress,
    }


@router.post("/{track_id}/modules/{module_number}/complete")
async def complete_module(
    track_id: str,
    module_number: int,
    req: CompleteModuleRequest,
    user: dict[str, Any] = Depends(require_auth),
):
    """Mark a module as complete and advance the student to the next module."""
    users = _require_mongo()
    track = _load_track(track_id)
    _get_module(track, module_number)  # validates existence

    progress = _ensure_track_progress(user, track_id)
    completed: list[int] = list(progress.get("completed_modules") or [])
    if module_number not in completed:
        completed.append(module_number)
    progress["completed_modules"] = sorted(completed)

    total = len(track.get("modules", [])) or 1
    progress["completion_percentage"] = (
        req.completion_percentage
        if req.completion_percentage is not None
        else round(100 * len(completed) / total, 2)
    )
    progress["current_module"] = min(module_number + 1, total)
    progress["last_active"] = now_utc()
    if len(completed) >= total:
        progress["completed_at"] = now_utc()

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                f"tracks_progress.{track_id}": progress,
                "updated_at": now_utc(),
            }
        },
    )
    return {"ok": True, "progress": progress}


@router.post("/{track_id}/modules/{module_number}/quiz-score")
async def record_quiz_score(
    track_id: str,
    module_number: int,
    req: QuizScoreRequest,
    user: dict[str, Any] = Depends(require_auth),
):
    """Record a quiz score for a module (keeps the best)."""
    users = _require_mongo()
    _get_module(_load_track(track_id), module_number)

    progress = _ensure_track_progress(user, track_id)
    scores: dict[str, int] = dict(progress.get("quiz_scores") or {})
    key = str(module_number)
    prior = int(scores.get(key, 0))
    scores[key] = max(prior, int(req.score))
    progress["quiz_scores"] = scores
    progress["last_active"] = now_utc()

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                f"tracks_progress.{track_id}": progress,
                "updated_at": now_utc(),
            }
        },
    )
    return {"ok": True, "quiz_scores": scores}


@router.post("/{track_id}/portfolio")
async def add_portfolio_item(
    track_id: str,
    req: PortfolioAddRequest,
    user: dict[str, Any] = Depends(require_auth),
):
    """Add a portfolio item (usually a module capstone project)."""
    users = _require_mongo()
    track = _load_track(track_id)
    _get_module(track, req.module_number)

    item = {
        "id": str(uuid.uuid4()),
        "track_id": track_id,
        "module_number": req.module_number,
        "project_name": req.project_name,
        "description": req.description,
        "github_url": req.github_url,
        "live_url": req.live_url,
        "tech_stack": req.tech_stack,
        "completed_at": now_utc(),
        "is_featured": req.is_featured,
    }

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$push": {"portfolio_items": item},
            "$set": {"updated_at": now_utc()},
        },
    )
    return {"ok": True, "item": item}


@router.get("/{track_id}/modules/{module_number}/resources")
async def module_resources(track_id: str, module_number: int):
    """
    LAYER 5 supporting data — extra resources for the module:
    Rwanda job market context, free certifications, relevant companies,
    pulled from africa_context.json.
    """
    track = _load_track(track_id)
    module = _get_module(track, module_number)
    africa = _load_africa_context()

    return {
        "track_id": track.get("id"),
        "module_number": module_number,
        "module_title": module.get("title"),
        "video_primary": module.get("video_primary"),
        "video_secondary": module.get("video_secondary"),
        "portfolio_contribution": module.get("portfolio_contribution", ""),
        "interview_questions": module.get("interview_questions", []),
        "rwanda_companies": africa.get("rwanda_tech_companies", []),
        "job_search_resources": africa.get("job_search_resources", []),
        "free_certifications": africa.get("free_certifications", []),
        "salary_benchmarks": africa.get("salary_benchmarks", {}),
    }
