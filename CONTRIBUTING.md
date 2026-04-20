# Contributing to Learn4Africa

Thank you for your interest in helping make free, high-quality education
accessible across Africa. This document explains how to set up your
environment, the conventions we follow, and how to get a change merged.

## Code of conduct

By participating, you agree to uphold the
[Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). Be kind.

## Getting set up

```bash
git clone https://github.com/<your-fork>/learn4africa.git
cd learn4africa
cp .env.example .env             # fill AUTH_SECRET, JWT_SECRET (see SECURITY.md)
npm run setup                    # installs frontend + backend deps
(cd backend && uvicorn main:app --reload --port 8001) &
npm run dev
```

AI is handled entirely by Claude (Anthropic) from inside Convex actions.
Set `ANTHROPIC_API_KEY` on the Convex deployment — no local AI services
need to run.

## Branching + commits

* Branch off `master` (or `main` after the first rename) using a short
  descriptive prefix: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.
* Keep commits focused. One logical change per commit.
* Conventional Commits style is encouraged but not enforced:
  `feat(auth): add refresh-token rotation`.

## Before opening a PR

```bash
# Backend
cd backend && python -m pytest -v          # 39 tests must stay green
# Frontend
npm run typecheck                          # tsc --noEmit
npm run build                              # full Next.js production build
```

CI runs the same three checks on every PR — they must all pass before merge.

## What we look for in a PR

* **Tests for new behaviour.** Auth changes especially — see
  `backend/tests/test_auth_routes.py` for patterns.
* **Honest docs.** If you add a feature, update the status table in `README.md`.
* **No new secrets in code.** Read `SECURITY.md` if you are touching auth.
* **Small, reviewable diffs.** Big refactors are easier as a series of PRs.

## Issue triage

* `bug` — something is broken.
* `enhancement` — new capability or polish.
* `good first issue` — scoped, well-defined, friendly to newcomers.
* `help wanted` — we'd love a contributor to pick this up.

## Project priorities (in order)

1. **Works for a student on a $40 Android over 3G in Kigali.** Mobile-first,
   low-bandwidth, graceful degradation when AI providers are unreachable.
2. **Free.** Anything that requires a paid API must have a free fallback.
3. **Trustworthy.** Auth + privacy mistakes block a release.
4. **Beautiful.** A platform students are proud to show their parents.

If you are unsure whether a change fits, open a discussion before writing
code. We would rather talk first than ask you to throw work away.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](./LICENSE) that covers this project.
