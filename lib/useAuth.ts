"use client";

/**
 * Learn4Africa — useAuth hook.
 *
 * Thin wrapper over NextAuth's useSession that exposes a shape more
 * convenient for our components: `user`, `token`, `status`, and
 * `isAuthenticated`.
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
  const session = data as unknown as
    | { backendToken?: string; user: AuthUser }
    | null;

  return {
    status: status as AuthStatus,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    user: session?.user ?? null,
    token: session?.backendToken ?? null,
  };
}
