/**
 * Learn4Africa — NextAuth v5 (Auth.js) configuration.
 *
 * Stage 1 (Convex port): on successful sign-in we upsert the user into
 * the Convex `users` table. The user's Convex `_id` is stashed on the
 * NextAuth session so the frontend can pass it into Convex queries /
 * mutations.
 *
 * Providers:
 *   1. Google — OAuth, fully wired via Convex (`api.users.upsertFromOAuth`).
 *   2. Credentials (email + password) — wired via Convex
 *      `api.passwords.verify` (bcrypt compare). Sign-up uses
 *      `api.passwords.signUp` from the register page. Password policy
 *      (12+ chars, letter + digit) is enforced in `convex/passwords.ts`.
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
      /**
       * Calls the Convex `passwords.verify` action which runs
       * bcryptjs against the stored hash. Returning null means
       * "invalid credentials" — NextAuth surfaces that to the login
       * page without leaking which emails are registered.
       */
      async authorize(creds) {
        const email = String(creds?.email || "").trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;

        try {
          const result = await convexServer.action(api.passwords.verify, {
            email,
            password,
          });
          if (!result) return null;
          return {
            id: result.id,
            email: result.email,
            name: result.name,
            authProvider: result.authProvider,
            preferredLanguage: result.preferredLanguage,
            activeTrackId: result.activeTrackId,
          };
        } catch (err) {
          console.error("[auth] credentials verify failed", err);
          return null;
        }
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
        // Credentials path already verified password in `authorize`.
        return true;
      }

      const email = (user.email || profile?.email || "").trim();
      if (!email) {
        console.error("[auth] Google sign-in returned no email");
        return false;
      }

      // Best-effort Convex upsert. If it fails (schema drift, prod env
      // misconfig, network blip), still let the user through. The
      // session just won't carry a Convex `_id`; the app already gates
      // Convex queries on `userId` and renders empty state cleanly.
      try {
        const result = await convexServer.mutation(api.users.upsertFromOAuth, {
          email,
          name: user.name || profile?.name || email.split("@")[0],
          avatarUrl: user.image || (profile?.picture as string | undefined),
          authProvider: "google",
        });

        (user as any).id = result.id;
        (user as any).authProvider = result.authProvider;
        (user as any).preferredLanguage = result.preferredLanguage || "en";
        (user as any).activeTrackId = result.activeTrackId ?? null;
      } catch (err) {
        const e = err as Error;
        console.error(
          "[auth] Convex upsertFromOAuth failed — allowing sign-in anyway",
          {
            email,
            convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
            errorName: e?.name,
            errorMessage: e?.message,
            errorStack: e?.stack,
          },
        );
        (user as any).authProvider = "google";
        (user as any).preferredLanguage = "en";
        (user as any).activeTrackId = null;
      }
      return true;
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
        // Leave `id` undefined when no userId is present. Empty-string
        // ids would silently pass `String(args.userId)` validation in
        // Convex handlers and turn into null after `normalizeId`, which
        // is harder to spot than a clear "no user" signal.
        (session.user as any).id = t.userId || undefined;
        (session.user as any).authProvider = t.authProvider;
        (session.user as any).preferredLanguage = t.preferredLanguage;
        (session.user as any).activeTrackId = t.activeTrackId ?? null;
      }
      return session;
    },
  },
});
