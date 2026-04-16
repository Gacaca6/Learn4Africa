"""
Learn4Africa — Pre-build Demo Curricula

Builds a small set of pre-baked curricula and saves them as JSON in
backend/data/curricula/. These act as the safety net for the hackathon
demo so we never depend on a live build during a presentation.

Run from the backend directory:
    cd backend
    python -m scripts.prebuild_curricula

Or:
    cd backend && python scripts/prebuild_curricula.py
"""

import asyncio
import json
import sys
from pathlib import Path

# Allow running this file directly with `python scripts/prebuild_curricula.py`
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from engines.curriculum_builder import build_curriculum  # noqa: E402

DATA_DIR = BACKEND_DIR / "data" / "curricula"

# Each entry: (slug, goal, level)
DEMOS: list[tuple[str, str, str]] = [
    (
        "python_beginner",
        "I want to learn Python programming from scratch and become a junior developer in Kigali",
        "beginner",
    ),
    (
        "web_dev_beginner",
        "I want to become a web developer and build websites for businesses in Rwanda",
        "beginner",
    ),
]


async def build_one(slug: str, goal: str, level: str) -> None:
    print()
    print("=" * 60)
    print(f"  Building demo: {slug}")
    print(f"  Goal: {goal}")
    print(f"  Level: {level}")
    print("=" * 60)

    try:
        curriculum = await build_curriculum(goal=goal, level=level)
    except Exception as e:
        print(f"  [FAILED] {e}")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_DIR / f"{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(curriculum, f, ensure_ascii=False, indent=2)

    modules = curriculum.get("modules", [])
    with_video = sum(1 for m in modules if m.get("video"))
    direct = sum(1 for m in modules if m.get("mwalimu_teaches_directly"))

    print(f"  [OK] Saved {out_path}")
    print(f"       Title: {curriculum.get('title', '')}")
    print(f"       Modules: {len(modules)} ({with_video} with video, {direct} direct-teach)")


async def main() -> None:
    print()
    print("Learn4Africa — pre-building demo curricula")
    print(f"Output directory: {DATA_DIR}")

    for slug, goal, level in DEMOS:
        await build_one(slug, goal, level)

    print()
    print("Done. Use these in the demo via GET /api/v1/curriculum/demo/<slug>")
    print()


if __name__ == "__main__":
    asyncio.run(main())
