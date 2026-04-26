"use client";

/**
 * Learn4Africa — useAuth hook.
 *
 * Thin wrapper over NextAuth's useSession that exposes a shape more
 * convenient for our components: `user`, `userId` (the Convex _id),
 * `status`, and `isAuthenticated`.
 *
 * Note: there is no separate "backend token" — the NextAuth session
 * cookie IS the auth surface. Convex queries/mutations that need to
 * scope by user pass `userId` directly as an argument; the value comes
 * from `session.user.id` set by the `signIn`/`jwt`/`session` callbacks
 * in `auth.ts`.
 */

import { useSession } from "next-auth/react";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  authProvider?: string;
  preferredLanguage?: string;
  activeTrackId?: string | null;
}

export function useAuth() {
  const { data, status } = useSession();
  const user = (data?.user as AuthUser | undefined) ?? null;

  return {
    status: status as AuthStatus,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    user,
    userId: user?.id ?? null,
  };
}
