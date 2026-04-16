# Learn4Africa — Auth & MongoDB Setup

This document covers everything you need to get the full auth flow
working locally: Google OAuth, MongoDB, and the FastAPI + Next.js
wiring. The rest of the app (tracks, curriculum builder, tutor, comics,
etc.) works without any of this — auth is additive.

## What you will set up

1. A Google OAuth client (free)
2. A MongoDB Atlas free cluster (or local Mongo)
3. Backend `.env` with `JWT_SECRET`, `GOOGLE_CLIENT_*`, `MONGODB_URI`
4. Frontend `.env.local` with `AUTH_SECRET`, `AUTH_GOOGLE_*`

---

## 1. Google OAuth client

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Learn4Africa — local`.
5. **Authorized JavaScript origins**:
   - `http://localhost:3000`
6. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
7. Click **Create**. Copy the **Client ID** and **Client secret**.

> The NextAuth v5 Google provider expects the redirect URI to match
> `/api/auth/callback/google` exactly. A typo here is the #1 cause of
> `redirect_uri_mismatch` errors.

## 2. MongoDB Atlas (free tier)

1. Sign up at <https://cloud.mongodb.com/> and create an **M0 Free**
   cluster. Pick a region close to you.
2. Under **Database Access**, create a user with a password.
3. Under **Network Access**, add `0.0.0.0/0` for local dev (lock this
   down for production).
4. Click **Connect → Drivers → Python**. Copy the connection string
   — it looks like
   `mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/`.

Prefer local? Install MongoDB Community and use
`mongodb://localhost:27017/`.

## 3. Backend env — `backend/.env`

Open `backend/.env` and fill in the auth block:

```env
# JWT
JWT_SECRET=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=168

# Google OAuth (ID token verification)
GOOGLE_CLIENT_ID=<from step 1>
GOOGLE_CLIENT_SECRET=<from step 1>

# MongoDB
MONGODB_URI=<from step 2>
MONGODB_DB_NAME=learn4africa
```

Install the new Python deps:

```bash
cd backend
pip install -r requirements.txt
```

This brings in `motor` (async MongoDB driver) and `google-auth`
(Google ID token verification). The app will keep running even if
`MONGODB_URI` is blank — progress sync just degrades to local-only
mode, which is useful while you're still getting auth working.

## 4. Frontend env — `.env.local`

At the repo root, create `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8001

# NextAuth (run: openssl rand -base64 32)
AUTH_SECRET=<long-random-string>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth — same client as the backend
AUTH_GOOGLE_ID=<from step 1>
AUTH_GOOGLE_SECRET=<from step 1>
```

## 5. Run it

Two terminals:

```bash
# Terminal 1 — backend
cd backend
uvicorn main:app --reload --port 8001

# Terminal 2 — frontend
npm run dev
```

Visit <http://localhost:3000>. Click **Start free** in the nav, then
**Continue with Google** or create an email account.

## 6. What to verify

- [ ] `GET http://localhost:8001/api/v1/auth/me` returns 401 without
      a Bearer token.
- [ ] Signing in with Google redirects back to `/tracks` and the top
      nav shows your avatar.
- [ ] Opening a track module page while signed out redirects to
      `/auth/login?callbackUrl=...`.
- [ ] Completing a module updates `users.tracks_progress` in Mongo
      (inspect with `mongosh` or Atlas UI).
- [ ] Reloading the page keeps your completed modules highlighted.

## Troubleshooting

**`redirect_uri_mismatch` from Google.** Double-check the redirect URI
in the Google Console matches `http://localhost:3000/api/auth/callback/google`
exactly (scheme, port, trailing slash).

**Auth backend is offline (MongoDB not configured).** Your
`backend/.env` is missing `MONGODB_URI` or the cluster is unreachable.
Run the backend and hit `GET /health` — the logs will show the real
connection error.

**`google-auth is not installed on the backend`.** Run
`pip install -r backend/requirements.txt` again. The dependency was
added in the same PR that introduced this doc.

**`AUTH_SECRET missing`** when starting Next. Set `AUTH_SECRET` in
`.env.local`. Any long random string works.

## Production notes

- Rotate `JWT_SECRET` and `AUTH_SECRET` before deploying.
- Restrict the Mongo Atlas IP allowlist to your app servers.
- Add the production domain to the Google OAuth redirect URIs.
- Set `NEXT_PUBLIC_API_URL` to the public backend URL.
- Consider moving the Credentials provider behind an email-verified
  flow before opening public registration.
