# backend-legacy

This is the **old FastAPI backend**, kept for reference while we port
features to Convex. Nothing here is called by the running app anymore.

**Do not add new features here.** All new work goes in `/convex/`.

## What's still useful

| Area | Where | Status |
| --- | --- | --- |
| Auth flow (JWT, bcrypt, policy) | `routes/auth.py`, `engines/auth_engine.py` | Ported to Convex (Stage 1 — Google only; Stage 2 brings email/password back) |
| User model | `models/user.py` | Ported — see `convex/schema.ts` |
| Tracks data (6 career tracks) | `data/tracks/*.json` | Will be imported into Convex in Stage 2 |
| AI engines (tutor, curriculum, comics, etc.) | `engines/*.py` | To be ported to Convex actions in Stage 3 |
| Gamification (XP, badges) | `engines/gamification.py` | Stage 2 |
| Media generation (podcasts, comics, songs) | `engines/{podcast,comic,songs}.py` | Stage 4 — will use Convex File Storage |
| Test suite (39 tests) | `tests/` | Will be rewritten as Convex tests in Stage 2 |

## Deletion plan

This folder is removed entirely in Stage 5, once every feature has a
working Convex equivalent and the frontend has fully cut over.

Until then, leave it alone.
