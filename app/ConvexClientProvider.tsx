"use client";

/**
 * Learn4Africa — Convex React provider.
 *
 * Wraps the app in a ConvexReactClient so any client component can call
 * `useQuery(api.users.getById, ...)` etc. Server-side code (route
 * handlers, NextAuth callbacks) talks to Convex through a separate
 * ConvexHttpClient — see `lib/convexServer.ts`.
 *
 * Environment: `NEXT_PUBLIC_CONVEX_URL` — set by `npx convex dev`
 * locally, set in the Vercel dashboard for prod.
 */

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// We intentionally do NOT throw at module-load if the env var is missing
// — that would break `next build` on Vercel when the var is only
// available at runtime. A clear error is logged instead; components that
// actually call Convex will fail loudly on first use.
if (!convexUrl && typeof window !== "undefined") {
  console.error(
    "[Convex] NEXT_PUBLIC_CONVEX_URL is not set. " +
      "Run `npx convex dev` locally, or add it to Vercel env vars.",
  );
}

const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
