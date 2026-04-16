# Changelog

All notable changes to Learn4Africa are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-04-16

First public release. Targeted at the April 2026 hackathon demo.

### Added
- **Auth.** Email + password and Google Sign-In (NextAuth v5 → FastAPI JWT exchange).
- **JWT lifecycle.** Access + refresh tokens with rotation, jti-based
  in-memory revocation, single-use purpose tokens for email verification
  and password reset.
- **Rate limiting.** slowapi caps on `/auth/register` (3/min),
  `/auth/login` (5/min), `/auth/forgot-password` (3/min), and others.
- **Password policy.** Minimum 8 chars, must include a letter and a digit.
- **Privacy gate.** Public portfolios are off by default; the public
  endpoint returns 404 until the user opts in.
- **Career tracks.** Six end-to-end learning paths with modules, practice
  exercises, interview prep, and curated resources.
- **Curriculum builder.** Streams a custom learning path with embedded
  YouTube videos for any topic the student types in.
- **AI Tutor (Mwalimu).** Multi-language chat with weak-area tracking
  and long-term memory.
- **Multi-format course viewer.** Reading, flashcards, quizzes, podcasts
  (Edge TTS), comics (Hugging Face inference), songs.
- **Portfolio.** Auto-generated from completed modules, exports to CV.
- **Observability.** `/health`, `/version`, `/status` endpoints; structured
  logging with per-request IDs.
- **Demo-mode banner.** Surfaces in the UI when MongoDB is unreachable
  and the backend has fallen back to the local JSON store.
- **Docker.** `docker compose up` brings up MongoDB + the backend with
  healthchecks; `--profile ai` adds an Ollama sidecar.
- **Tests.** 39 pytest tests covering JWT, bcrypt, password policy,
  full auth route flows, and the portfolio privacy gate.

### Security
- bcrypt for password storage (direct, not via passlib).
- HS256 JWTs with a configurable secret.
- CORS rejects `*` at startup; allowed origins read from `CORS_ORIGINS`.
- See [SECURITY.md](./SECURITY.md) for the full threat model and
  secret-rotation playbook.
