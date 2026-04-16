/**
 * Learn4Africa — NextAuth v5 (Auth.js) configuration.
 *
 * Two providers:
 *   1. Google — primary OAuth flow. On sign-in, we forward the Google
 *      ID token to our FastAPI backend (`/api/v1/auth/google`) which
 *      verifies it, upserts the user in MongoDB, and returns a JWT.
 *
 *   2. Credentials — email + password fallback for learners without a
 *      Google account. Calls `/api/v1/auth/login` and stores the JWT.
 *
 * The backend JWT travels through NextAuth's own JWT callback so the
 * frontend can attach it as `Authorization: Bearer ...` to any API call.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// ---------------------------------------------------------------------------
// Module augmentation — surface backend JWT + user id on the session
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    user: {
      id?: string;
      authProvider?: string;
      preferredLanguage?: string;
      activeTrackId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    backendToken?: string;
    authProvider?: string;
    preferredLanguage?: string;
    activeTrackId?: string | null;
  }
}

// Note: next-auth v5 stores JWT augmentations via the "next-auth" module
// itself — no separate "next-auth/jwt" declaration needed here.

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function exchangeGoogleIdToken(idToken: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend google exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
      auth_provider: string;
      preferred_language?: string;
      active_track_id?: string | null;
    };
  }>;
}

async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Login failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
      auth_provider: string;
      preferred_language?: string;
      active_track_id?: string | null;
    };
  }>;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email || "").trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;
        try {
          const data = await loginWithPassword(email, password);
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            image: data.user.avatar_url || null,
            backendToken: data.access_token,
            authProvider: data.user.auth_provider,
            preferredLanguage: data.user.preferred_language || "en",
            activeTrackId: data.user.active_track_id ?? null,
          };
        } catch (err) {
          console.error("[auth] credentials authorize failed", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * When a Google sign-in succeeds, exchange the ID token with the
     * backend and attach the backend JWT to the NextAuth user object
     * so it can be picked up by the `jwt` callback below.
     */
    async signIn({ account, user }) {
      if (account?.provider !== "google") return true;
      const idToken = account.id_token as string | undefined;
      if (!idToken) {
        console.error("[auth] Google provider returned no id_token");
        return false;
      }
      try {
        const data = await exchangeGoogleIdToken(idToken);
        // Mutate the user object — NextAuth passes this into `jwt()`.
        (user as any).id = data.user.id;
        (user as any).backendToken = data.access_token;
        (user as any).authProvider = data.user.auth_provider;
        (user as any).preferredLanguage = data.user.preferred_language || "en";
        (user as any).activeTrackId = data.user.active_track_id ?? null;
        return true;
      } catch (err) {
        console.error("[auth] backend google exchange failed", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).userId = (user as any).id;
        (token as any).backendToken = (user as any).backendToken;
        (token as any).authProvider = (user as any).authProvider;
        (token as any).preferredLanguage = (user as any).preferredLanguage;
        (token as any).activeTrackId = (user as any).activeTrackId;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as any;
      if (session.user) {
        (session.user as any).id = t.userId || "";
        (session.user as any).authProvider = t.authProvider;
        (session.user as any).preferredLanguage = t.preferredLanguage;
        (session.user as any).activeTrackId = t.activeTrackId ?? null;
      }
      (session as any).backendToken = t.backendToken;
      return session;
    },
  },
});
