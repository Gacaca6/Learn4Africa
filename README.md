<div align="center">

# Learn4Africa

**Free AI-powered learning platform for Africa.**

[![CI](https://github.com/learn4africa/learn4africa/actions/workflows/ci.yml/badge.svg)](https://github.com/learn4africa/learn4africa/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-39%20passing-brightgreen)](./backend/tests)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://python.org)

*"Zigama" means "to understand deeply" — because true education is not about memorising, it is about seeing the world through a new lens.*

</div>

## Quick Start

```bash
git clone https://github.com/your-org/learn4africa.git && cd learn4africa
cp .env.example .env                            # fill in AUTH_SECRET + JWT_SECRET (see SECURITY.md)
npm run setup                                   # installs frontend + backend deps
(cd backend && uvicorn main:app --reload --port 8001) &   # FastAPI on :8001
npm run dev                                     # Next.js on :3000
open http://localhost:3000
```

Or run the whole stack with Docker: `docker compose up` (MongoDB included).
Add `--profile ai` to bring up Ollama locally for AI features.

## Feature status

The platform is a work in progress. The table below is intentionally blunt
about what works today and what is stubbed. Everything marked **Live** is
called by the frontend and verified end-to-end. **Beta** means wired up
but rough. **Stub** means a route or UI exists but is not wired.

| Feature              | Status | Notes                                                                             |
| -------------------- | ------ | --------------------------------------------------------------------------------- |
| Reading              | Live   | Rendered inside the course viewer (`/course/[id]`) and track modules              |
| Flashcards           | Live   | Backend `/api/v1/flashcards` + course-viewer tab                                  |
| Quizzes              | Live   | Backend `/api/v1/quizzes` + course-viewer tab                                     |
| Podcasts             | Beta   | Edge-TTS generation works, podcast player is basic                                |
| Comics               | Beta   | Hugging Face image generation wired; panel quality varies                         |
| Games                | Stub   | Gamification engine exists (XP, badges) but no interactive game UI               |
| Songs                | Beta   | Backend generates lyrics + audio; UI exposes download only                        |
| AI Tutor (Mwalimu)   | Live   | `/tutor` chat with multi-language support and struggle detection                  |
| Career Tracks (6)    | Live   | `/tracks` — roadmap, modules, practice, interview prep, resources                 |
| Curriculum Builder   | Live   | `/curriculum/new` streams a custom learning path with YouTube videos              |
| Google Sign-In       | Live   | NextAuth v5 Google provider, backend JWT exchange via `/api/v1/auth/google`       |
| Portfolio            | Live   | `/portfolio` — auto-generated from completed modules; CV export + share           |
| Progress Sync        | Beta   | Writes to MongoDB when signed in; falls back to local_json + shows demo banner    |

## Architecture

```
learn4africa/
|-- app/                    # Next.js 14 frontend (App Router)
|   |-- page.tsx            # Landing page
|   |-- tracks/             # Career tracks + learning room
|   |-- curriculum/         # AI curriculum builder
|   |-- course/             # Multi-format course viewer
|   |-- portfolio/          # Auto-generated CV + projects
|   |-- tutor/              # Mwalimu chat
|   `-- api/auth/           # NextAuth route handlers
|-- components/             # TopNav, UserMenu, DemoModeBanner
|-- lib/                    # apiClient, curriculumStore, trackSync, useAuth
|-- backend/                # Python FastAPI backend
|   |-- main.py             # API entry point (port 8001)
|   |-- routes/             # auth, tracks, tutor, curriculum, courses, ...
|   |-- engines/            # AI generation engines
|   `-- models/mongo.py     # Mongo + local_json fallback
|-- middleware.ts           # NextAuth route protection
|-- auth.ts                 # NextAuth v5 config
`-- .env.example            # Environment template
```

## Tech stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand, NextAuth v5
- **Backend**: Python FastAPI on port 8001
- **AI**: Ollama (default model `minimax-m2:cloud`), with OpenAI/Anthropic fallbacks
- **Database**: MongoDB Atlas (falls back to `local_json` for demos)
- **Audio**: Edge TTS (free)
- **Images**: Hugging Face Inference API (free tier)
- **Auth**: Google OAuth + email/password credentials

## Designed for Africa

- **Mobile-first**: PWA-ready, works on basic smartphones
- **Multilingual**: English, Swahili, Hausa, Yoruba, Amharic, French, Arabic, Kinyarwanda
- **Low bandwidth**: Text-first with optional media; caches locally
- **Free forever**: Can run entirely on local/free AI providers

## Testing

```bash
# Backend — 39 tests covering auth routes, JWT lifecycle, bcrypt, policy
cd backend && python -m pytest -v

# Frontend — type-check + production build
npm run typecheck
npm run build
```

See [SECURITY.md](./SECURITY.md) for secret-rotation procedures and the
threat model covering JWT revocation, rate limits, and the portfolio
privacy gate.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes
4. Push and open a Pull Request

## License

MIT License — free to use, modify, and distribute. Knowledge belongs to everyone.

---

*Built with love for every child who deserves to see the world through a new lens.*
