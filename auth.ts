/**
 * Learn4Africa — NextAuth v5 (Auth.js) configuration.
 *
 * Stage 1 (Convex port): on successful sign-in we upsert the user into
 * the Convex `users` table. The user's Convex `_id` is stashed on the
 * NextAuth session so the frontend can pass it into Convex queries /
 * mutations.
 *
 * Providers:
 *   1. Google — OAuth, fully wired via Convex.
 *   2. Credentials (email + password) — DISABLED in Stage 1. The old
 *      FastAPI `/api/v1/auth/login` route is gone; email/password will
 *      come back in Stage 2 with bcrypt-in-Convex. Until then the form
 *      returns "Invalid credentials" if submitted.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { api } from "@/convex/_generated/api";
import { convexServer } from "@/lib/convexServer";

// ---------------------------------------------------------------------------
// Module augmentation — surface convex user id on the session
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      authProvider?: string;
      preferredLanguage?: string;
      activeTrackId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    authProvider?: string;
    preferredLanguage?: string;
    activeTrackId?: string | null;
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

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
      // Stage 1: email/password is temporarily disabled. Stage 2 will
      // reintroduce it backed by a Convex action that verifies bcrypt
      // hashes inline. Returning null here makes NextAuth redirect back
      // to /auth/login with the standard "Invalid credentials" error.
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    /**
     * On Google sign-in, upsert the user in Convex and stash the
     * Convex `_id` on the NextAuth user object so the `jwt` callback
     * below can persist it.
     */
    async signIn({ account, user, profile }) {
      if (account?.provider !== "google") {
        // Only Google is active in Stage 1. Credentials path already
        // returned null above, so this branch just guards the future.
        return true;
      }

      const email = (user.email || profile?.email || "").trim();
      if (!email) {
        console.error("[auth] Google sign-in returned no email");
        return false;
      }

      try {
        const result = await convexServer.mutation(api.users.upsertFromOAuth, {
          email,
          name: user.name || profile?.name || email.split("@")[0],
          avatarUrl: user.image || (profile?.picture as string | undefined),
          authProvider: "google",
        });

        // Convex returns the user's _id + profile fields. Mutate the
        // NextAuth user object so `jwt()` picks them up.
        (user as any).id = result.id;
        (user as any).authProvider = result.authProvider;
        (user as any).preferredLanguage = result.preferredLanguage || "en";
        (user as any).activeTrackId = result.activeTrackId ?? null;
        return true;
      } catch (err) {
        console.error("[auth] Convex user upsert failed", err);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        (token as any).userId = (user as any).id;
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
      return session;
    },
  },
});
