/**
 * Learn4Africa — route protection middleware.
 *
 * Gated routes:
 *   /tracks/:trackId/:moduleNumber  — Learning Room (requires auth)
 *   /portfolio                      — user's portfolio dashboard
 *   /tutor                          — personalised Mwalimu chat
 *   /curriculum/:id                 — editing/viewing a specific curriculum
 *
 * Public:
 *   /tracks                 — track selection (funnel)
 *   /tracks/:trackId        — roadmap (funnel)
 *   /curriculum/new         — creation funnel (gating this kills conversion)
 *
 * This layout gives anonymous visitors a taste of the platform before
 * asking them to sign in. Personalised experiences (tutor context,
 * portfolio, saved curricula) stay behind auth.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // `/curriculum/new` must stay public — we match it first and bail.
  if (pathname === "/curriculum/new" || pathname.startsWith("/curriculum/new/")) {
    return NextResponse.next();
  }

  const protectedPaths: RegExp[] = [
    /^\/tracks\/[^/]+\/[^/]+/, // /tracks/:trackId/:moduleNumber and deeper
    /^\/portfolio(\/|$)/,
    /^\/tutor(\/|$)/,
    /^\/curriculum\/[^/]+/, // any /curriculum/:id — /new already short-circuited above
  ];

  const needsAuth = protectedPaths.some((re) => re.test(pathname));
  if (needsAuth && !isLoggedIn) {
    const signInUrl = new URL("/auth/login", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Apply middleware to everything except static assets and the NextAuth route.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)"],
};
