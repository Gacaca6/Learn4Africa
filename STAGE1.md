# Stage 1 — Convex scaffolding + Google sign-in

**Goal of this stage:** the app runs locally on Next.js + Convex, you can
sign in with Google, and your user row lands in the Convex `users`
table. Everything else is stubbed.

**Old backend (`backend-legacy/`):** still on disk for reference, but
nothing calls it. You can ignore it.

---

## What changed in the codebase

| File | Change |
| --- | --- |
| `convex/schema.ts` | **New.** Defines the `users` table with an email index. |
| `convex/users.ts` | **New.** `upsertFromOAuth`, `updateProfile`, `getById`, `getByEmail`, `getPublicProfile`. |
| `app/ConvexClientProvider.tsx` | **New.** Wraps the React tree with a Convex client. |
| `lib/convexServer.ts` | **New.** Server-side `ConvexHttpClient` for NextAuth callbacks. |
| `app/providers.tsx` | Adds `ConvexClientProvider` around the app. |
| `auth.ts` | Rewritten: Google sign-in now upserts into Convex. Email/password is disabled until Stage 2. |
| `package.json` | Adds `convex` + `concurrently`; new script `npm run dev:all`. |
| `.env.example` | Replaced with Convex-era variables. |
| `backend/` → `backend-legacy/` | Moved. Not deleted. Reference only. |
| `docker-compose.yml`, `render.yaml`, etc. | Removed — not needed on Convex + Vercel. |

---

## What you do now (three commands + some clicks)

### 1. Install the new deps

```bash
npm install
```

This adds `convex` and `concurrently` to your local `node_modules`.

### 2. Link the repo to your Convex deployment

```bash
npx convex dev
```

First time only: it will ask you to log in (opens a browser) and then
which deployment to link. Pick your existing **`Learn4africa`** one.

What this does:
- Writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into your
  `.env.local` automatically
- Pushes `convex/schema.ts` and `convex/users.ts` to your Convex cloud
- Starts watching `convex/` for changes — any edit hot-deploys

Leave this terminal running.

### 3. In a second terminal, start Next.js

```bash
npm run dev
```

Or use the combined script (starts both at once):

```bash
npm run dev:all
```

### 4. Fill in the rest of `.env.local`

Open `.env.local` (created by `npx convex dev`). You'll see the Convex
vars already there. Add:

```
AUTH_SECRET=<run: npx auth secret>
NEXTAUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
```

If you don't have Google OAuth creds yet:
https://console.cloud.google.com/apis/credentials → Create Credentials →
OAuth client ID → Web application. Redirect URI: `http://localhost:3000/api/auth/callback/google`

### 5. Smoke test

1. Open http://localhost:3000
2. Click **Sign in with Google**
3. Complete the flow — should land you back on the home page, signed in
4. Open https://dashboard.convex.dev/ → your `Learn4africa` project →
   **Data** tab → **users** table → you should see your row

If step 4 works, **Stage 1 is done.** 🎉

---

## Known issues in Stage 1 (fixed in later stages)

- **Email + password sign-in returns "Invalid credentials"** — the
  Credentials provider is stubbed. Stage 2 brings it back with
  bcrypt-in-Convex.
- **Tracks page, curriculum builder, tutor, portfolio** — still call
  the old backend URL which is down. These will show errors or empty
  states. We port them in Stages 2 + 3. Sign-in works in isolation so
  we can validate the Convex wiring before bulk-porting features.
- **Some TypeScript errors from `lib/apiClient.ts` etc.** — these hit
  the old FastAPI paths. They'll disappear as we port each page.

---

## Deploy to Vercel (when you're ready)

This can wait until Stage 2 or 3 once enough features work. When you
do it:

1. https://vercel.com → Add New → Project → import `Gacaca6/Learn4Africa`
2. Framework preset: Next.js (auto-detected)
3. Environment Variables — paste:
   ```
   NEXT_PUBLIC_CONVEX_URL=<from convex dashboard, Settings > URL & Deploy Key>
   AUTH_SECRET=<new random string for prod — don't reuse dev>
   NEXTAUTH_URL=https://<your-vercel-subdomain>.vercel.app
   AUTH_GOOGLE_ID=<same google client id>
   AUTH_GOOGLE_SECRET=<same google client secret>
   ```
4. Add your production Convex URL to Google OAuth redirect URIs:
   `https://<your-vercel-subdomain>.vercel.app/api/auth/callback/google`
5. Deploy.

No Dockerfile, no `render.yaml`, no Uvicorn start command, no CORS to
configure. Convex runs on Convex's infrastructure, Vercel runs the
Next.js app, and they talk over HTTPS. That's the whole deploy.

---

## What Stage 2 brings

- Port the 6 career tracks + track progress (Convex tables + mutations)
- Port email/password sign-up + login (Convex action with bcrypt)
- Port curriculum builder data model
- Delete corresponding chunks from `backend-legacy/`
