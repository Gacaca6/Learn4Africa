# Security

This document describes Learn4Africa's security posture, the secrets
that must stay private, and the exact steps to rotate them if one leaks.

## Reporting a vulnerability

Email **security@learn4africa.dev** (or open a private GitHub Security
Advisory). Please include:

* What you found and how to reproduce it.
* Which environment (local dev, staging, demo).
* Whether you have exploited it against real user data (please don't).

We aim to acknowledge within 48 hours and patch critical issues within
7 days. Please do not disclose publicly until a fix is released.

## Threat model

| Surface                 | Mitigation                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| Password storage        | bcrypt (cost 12) via the `bcrypt` library — no reversible storage anywhere |
| JWT forgery             | HS256 with a ≥ 48-byte random `JWT_SECRET`; no RS256 key material on disk  |
| JWT replay after logout | `jti` stored in an in-memory revocation set; checked on every `verify_token` |
| Refresh token reuse     | `/auth/refresh` revokes the old `jti` before issuing the new pair           |
| Password-reset replay   | Reset + verify-email tokens carry a `purpose` claim and are single-use      |
| Credential stuffing     | slowapi rate limits: 3/min /register, 5/min /login, 3/min /forgot-password |
| Email enumeration       | `/forgot-password` always returns 200, regardless of whether user exists   |
| Google token forgery    | `google-auth` verifies issuer + signature against live Google JWKs         |
| CORS misuse             | Allowed origins are an explicit list; `*` is rejected at startup           |
| Profile data leak       | `/users/{id}/portfolio` returns 404 unless `portfolio_public` is true      |
| XSS                     | React auto-escapes; markdown rendering uses a whitelist, no `innerHTML`    |

Not yet addressed (roadmap):

* **Revocation blocklist survives restart.** Move `_revoked_jti` to Redis
  with TTL equal to token expiry. Today a process restart would accept
  previously-revoked tokens until their natural expiry.
* **Refresh token family detection.** If a refresh token is reused after
  rotation, revoke the whole chain (current behaviour: just reject the
  reused one).
* **Email delivery for verify/reset.** Tokens currently come back in the
  JSON response as `dev_only_token` so the demo works without SMTP.
  Before production, wire up a transactional email provider and remove
  that field.

## Secrets

Never commit these to git. `.gitignore` excludes every `.env*` file.

| Variable              | What breaks if it leaks                                  |
| --------------------- | -------------------------------------------------------- |
| `AUTH_SECRET`         | Attackers can forge NextAuth session cookies             |
| `JWT_SECRET`          | Attackers can mint arbitrary backend access tokens       |
| `AUTH_GOOGLE_SECRET`  | Attackers can impersonate the Learn4Africa OAuth client  |
| `GOOGLE_CLIENT_SECRET`| Same as above (backend copy of the same secret)          |
| `HF_TOKEN`            | Attackers can drain Hugging Face inference quota         |
| `MONGODB_URI`         | Full read/write access to production user data           |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (if set) | Billable quota theft           |

## Generating strong values

```bash
# AUTH_SECRET — NextAuth expects 32 bytes base64
openssl rand -base64 32

# JWT_SECRET — 48 bytes hex (longer than HS256's 256-bit minimum)
openssl rand -hex 48
```

## Rotating a compromised secret

### 1. `JWT_SECRET` leaked

1. Generate a new value (see above).
2. Update the secret in your secret store (Doppler, AWS Secrets Manager,
   `.env`, etc.).
3. Restart the backend (`docker compose up -d --force-recreate backend`).
4. All existing access + refresh tokens immediately become invalid —
   users are pushed back to the sign-in screen on their next request.
   That is the intended blast radius. No user data needs to change.

### 2. `AUTH_SECRET` leaked

1. Generate a new value.
2. Update `.env` / secret store.
3. Restart the frontend (`docker compose up -d --force-recreate frontend`).
4. All NextAuth session cookies become invalid. Users sign in again.

### 3. Google OAuth secrets leaked

1. Open the Google Cloud Console → APIs & Services → Credentials.
2. On the OAuth 2.0 client, click **Reset Secret**.
3. Copy the new value into `AUTH_GOOGLE_SECRET` and `GOOGLE_CLIENT_SECRET`.
4. The **Client ID** (`AUTH_GOOGLE_ID` / `GOOGLE_CLIENT_ID`) does NOT
   change — only the secret. No user-visible impact.

### 4. `MONGODB_URI` leaked

1. In MongoDB Atlas (or your hosted Mongo provider) → **Database Access**.
2. Rotate the password of the user in the URI, or delete the user and
   create a new one with a new password.
3. Update `MONGODB_URI` everywhere it appears.
4. Restart the backend. No user passwords need to change — they are
   stored as bcrypt hashes, so even a full DB exfiltration does not
   reveal plaintext credentials.

### 5. `HF_TOKEN` leaked

1. Hugging Face → Settings → Access Tokens → **Revoke**.
2. Create a new read-only token.
3. Update `HF_TOKEN` in your secret store.
4. Restart the backend.

## Operational checklist before going live

* [ ] Every value in `.env.example` has been replaced with a production-
      strength secret in the deployed environment.
* [ ] `DEBUG=false` on the backend.
* [ ] `CORS_ORIGINS` lists only the public frontend origin(s) — no `*`.
* [ ] `NEXTAUTH_URL` matches the public URL exactly (scheme + host).
* [ ] MongoDB user has `readWrite` on the app DB only, never `dbAdmin`
      or `root`.
* [ ] Backups of the MongoDB users collection are encrypted at rest.
* [ ] The `dev_only_token` field has been removed from
      `/auth/forgot-password` and `/auth/verify-email/request` responses
      and replaced with real email delivery.
* [ ] A Redis instance is configured for the JWT revocation blocklist so
      revoked tokens survive backend restarts.
* [ ] Rate-limit caps are reviewed in `backend/routes/auth.py` and tuned
      for real traffic (current defaults target a hackathon demo).
