<div align="center">

# Learn4Africa

**Free AI-powered learning platform for Africa.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-backend-ee342f)](https://convex.dev)
[![Vercel](https://img.shields.io/badge/Vercel-hosting-000000?logo=vercel)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

*"Zigama" means "to understand deeply" — because true education is not about memorising, it is about seeing the world through a new lens.*

</div>

## Quick Start

```bash
git clone https://github.com/Gacaca6/Learn4Africa.git && cd Learn4Africa
npm install                                     # installs Next.js + Convex deps
cp .env.example .env.local                      # fill in AUTH_SECRET + Google OAuth
npx convex dev                                  # links this repo to your Convex deployment
                                                # (writes NEXT_PUBLIC_CONVEX_URL into .env.local)
npm run dev:all                                 # Next.js on :3000 + Convex watcher
open http://localhost:3000
```

Deployment: **Vercel** (frontend) + **Convex Cloud** (backend, DB, functions).
See `STAGE1.md` for step-by-step deploy.

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
| Podcasts             | Beta   | Browser Web Speech API reads Mwalimu aloud; no server TTS needed                  |
| Comics               | Stub   | Removed in the Claude-only refactor; may return as Claude-drawn ASCII art         |
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
|   |-- api/auth/           # NextAuth route handlers
|   `-- ConvexClientProvider.tsx
|-- convex/                 # Convex backend — schema + functions
|   |-- schema.ts           # Database tables + indexes
|   `-- users.ts            # User queries + mutations
|-- components/             # TopNav, UserMenu, DemoModeBanner
|-- lib/                    # apiClient, curriculumStore, convexServer
|-- auth.ts                 # NextAuth v5 — upserts into Convex on sign-in
|-- middleware.ts           # NextAuth route protection
|-- backend-legacy/         # Old FastAPI backend — reference only, being ported
`-- .env.example            # Environment template
```

## Tech stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand, NextAuth v5
- **Backend**: [Convex](https://convex.dev) — TypeScript functions + reactive DB
- **Hosting**: Vercel (frontend) + Convex Cloud (backend/DB/functions)
- **AI**: Claude (Anthropic) — `claude-sonnet-4-5`, called from Convex actions only
- **Auth**: Google OAuth via NextAuth v5 + Convex user upsert

## Designed for Africa

- **Mobile-first**: PWA-ready, works on basic smartphones
- **Multilingual**: English, Swahili, Hausa, Yoruba, Amharic, French, Arabic, Kinyarwanda
- **Low bandwidth**: Text-first with optional media; caches locally
- **Free forever** for students: one Anthropic key on the server, no cost to learners

## Testing

```bash
# Type-check + production build
npm run typecheck
npm run build
```

Convex function tests are coming in Stage 2 as we port features across.
The old FastAPI test suite (39 tests) lives in `backend-legacy/tests/`
for reference.

See [SECURITY.md](./SECURITY.md) for the threat model and secret-rotation
procedures.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes
4. Push and open a Pull Request

## License

MIT License — free to use, modify, and distribute. Knowledge belongs to everyone.

---

*Built with love for every child who deserves to see the world through a new lens.*
