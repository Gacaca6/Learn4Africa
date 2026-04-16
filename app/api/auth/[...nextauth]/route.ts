/**
 * Learn4Africa — NextAuth API route.
 *
 * This is the catch-all endpoint NextAuth uses for its internal flows
 * (callback, signin, signout, session, csrf, providers, etc.).
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
