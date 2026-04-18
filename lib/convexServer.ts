/**
 * Learn4Africa — server-side Convex client.
 *
 * For code running on the Next.js server (route handlers, NextAuth
 * callbacks, Server Components) we use a `ConvexHttpClient` that hits
 * Convex over HTTPS. Do NOT import this module from client components
 * — it will work but defeats Convex's real-time subscriptions and ships
 * bigger JS bundles. Client code should use the `useQuery` / `useMutation`
 * hooks from `convex/react` wired up in `app/ConvexClientProvider.tsx`.
 *
 * The URL is read from `NEXT_PUBLIC_CONVEX_URL` because Convex deployment
 * URLs are the same for client and server (public anyway — access is
 * gated by function-level auth, not URL secrecy).
 */

import { ConvexHttpClient } from "convex/browser";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  // Not throwing — NextAuth/build steps need this module importable
  // even before env vars are filled in. Callers will see a clear error
  // from the HTTP client if they try to use it without a URL.
  console.warn(
    "[convexServer] NEXT_PUBLIC_CONVEX_URL is not set. " +
      "Server-side Convex calls will fail until you run `npx convex dev` " +
      "or set the var in your deployment platform.",
  );
}

export const convexServer = new ConvexHttpClient(
  url ?? "https://placeholder.convex.cloud",
);
