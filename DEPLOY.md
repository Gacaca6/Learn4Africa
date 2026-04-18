# Deploying Learn4Africa to Render

This deploys **both** frontend and backend to Render from one Blueprint.
Free tier. No credit card. ~20 minutes start to finish.

---

## What you need before starting

Have these saved locally in a text file (don't paste into any website until
the instructions tell you to):

| Thing | Where to get it |
| --- | --- |
| **`MONGODB_URI`** | Your Atlas URI (see step 1 of the walkthrough chat) |
| **`OPENAI_API_KEY`** | https://platform.openai.com/api-keys — optional, $5 min |
| **`GOOGLE_CLIENT_ID` + `SECRET`** | https://console.cloud.google.com/apis/credentials — optional |
| **`HF_API_TOKEN`** | https://huggingface.co/settings/tokens — optional, for comics |

Anything marked "optional" can be left blank at first. The app degrades
gracefully:
- No `OPENAI_API_KEY` → AI features return placeholder text
- No Google creds → only email/password sign-in works
- No HF token → comics are disabled, everything else works

---

## Step 1 — Create the Blueprint (5 min)

1. Go to https://dashboard.render.com → sign in with GitHub
2. Top-right → **New** → **Blueprint**
3. Connect your GitHub → pick **Gacaca6/Learn4Africa**
4. Render scans the repo and finds `render.yaml` → click **Apply**
5. Render creates two services:
   - `learn4africa-backend` (Python / FastAPI)
   - `learn4africa-frontend` (Node / Next.js)

Both start building immediately. The **first build will fail** because
the secrets aren't filled in yet. That's expected — step 2 fixes it.

---

## Step 2 — Fill in the secrets (10 min)

### 2a. Backend secrets

1. Dashboard → click **`learn4africa-backend`**
2. Left sidebar → **Environment**
3. For each of these, click **Edit** and paste the value:

```
MONGODB_URI       = (your Atlas URI with password + /learn4africa)
OPENAI_API_KEY    = sk-...  (or leave blank)
GOOGLE_CLIENT_ID  = ...     (or leave blank)
GOOGLE_CLIENT_SECRET = ...  (or leave blank)
HF_API_TOKEN      = hf_...  (or leave blank)
```

**Leave `CORS_ORIGINS` blank for now** — we fill it in step 3.

4. Click **Save Changes**. Do NOT manually redeploy yet.

### 2b. Frontend secrets

1. Dashboard → click **`learn4africa-frontend`**
2. Left sidebar → **Environment**
3. You'll see the frontend URL at the top of the page, looks like:
   `https://learn4africa-frontend.onrender.com`
   **Copy that URL — you'll paste it in several places.**

4. Also copy the backend URL (click the backend service in a new tab):
   `https://learn4africa-backend.onrender.com` (or similar)

5. Back on the frontend **Environment** page, fill in:

```
NEXT_PUBLIC_API_URL   = https://learn4africa-backend.onrender.com
NEXT_PUBLIC_APP_URL   = https://learn4africa-frontend.onrender.com
NEXTAUTH_URL          = https://learn4africa-frontend.onrender.com
AUTH_GOOGLE_ID        = (same as GOOGLE_CLIENT_ID — or blank)
AUTH_GOOGLE_SECRET    = (same as GOOGLE_CLIENT_SECRET — or blank)
```

6. Click **Save Changes**.

---

## Step 3 — Wire CORS (2 min)

1. Dashboard → **`learn4africa-backend`** → **Environment**
2. Edit `CORS_ORIGINS`:
   ```
   https://learn4africa-frontend.onrender.com
   ```
   (paste the exact frontend URL from step 2b, no trailing slash)
3. Save Changes

Render will redeploy both services automatically after the env changes.
Watch the **Logs** tab on each service — wait for:
- Backend: `Uvicorn running on http://0.0.0.0:10000`
- Frontend: `Listening on port 10000`

---

## Step 4 — Update Google OAuth (2 min, only if using Google sign-in)

1. https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. **Authorized redirect URIs** → add:
   ```
   https://learn4africa-frontend.onrender.com/api/auth/callback/google
   ```
4. **Authorized JavaScript origins** → add:
   ```
   https://learn4africa-frontend.onrender.com
   ```
5. Save

---

## Step 5 — Smoke test (3 min)

1. Open `https://learn4africa-backend.onrender.com/health` in a browser
   → should return `{"status":"ok",...}`
2. Open `https://learn4africa-frontend.onrender.com`
   → landing page loads
3. Try **Sign up** with email + password
   → should create a user and log you in
4. Atlas → Browse Collections → `learn4africa.users`
   → your test signup should be there ✅

---

## Things to know about Render's free tier

- Both services **spin down after 15 minutes of inactivity**
- First request after idle takes **~30 seconds** to wake up
- For the hackathon demo: hit your URL 30s before showing the judges so
  it's warm
- 750 free hours/month per service = plenty for a demo
- Logs are kept for 7 days on free tier

If cold starts are a dealbreaker for your demo, upgrade the backend to
the **Starter plan ($7/mo)** — it stays warm 24/7. Frontend on free tier
is fine because it's just serving a Next.js app.

---

## If something goes wrong

- **Backend crashes on boot** → check `Logs` tab, usually a missing env
  var or typo in `MONGODB_URI`
- **Frontend builds but blank page** → check browser console; usually
  `NEXT_PUBLIC_API_URL` is wrong or CORS is blocking
- **"CORS error" in browser console** → `CORS_ORIGINS` on backend doesn't
  exactly match the frontend URL (trailing slash, http vs https, etc.)
- **"Application failed to respond"** → service is still waking up
  (free tier cold start); wait 30s

Paste the last 20 log lines into the deploy chat and I'll debug.
