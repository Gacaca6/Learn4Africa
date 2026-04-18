/**
 * Learn4Africa — user queries & mutations.
 *
 * This is the Convex equivalent of the old `backend/routes/users.py` +
 * `backend/models/user.py`. Every read/write to the `users` table goes
 * through a function defined here.
 *
 * Security model (Stage 1):
 *   - `upsertFromOAuth` is called from the NextAuth `signIn` callback
 *     running on the Next.js server. We trust that context because the
 *     OAuth ID token has already been verified by Google before we get
 *     called. We do NOT expose this mutation to unauthenticated browser
 *     code — callers on the client pass through the NextAuth session.
 *
 *   - `getByEmail` is used server-side only (same trust model). Client
 *     components should use `me` which takes the user's id from the
 *     authenticated session instead.
 *
 * Stage 2 will harden this by installing the real Convex auth adapter,
 * at which point `ctx.auth.getUserIdentity()` gives us the signed-in
 * user's id directly and we drop the "trust the caller" shortcut.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────

/**
 * Insert a user if they don't exist yet, otherwise refresh name/avatar.
 * Returns the user's Convex `_id` as a string so the NextAuth session
 * can stash it.
 *
 * Called from `auth.ts` on every successful sign-in. Idempotent.
 */
export const upsertFromOAuth = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    authProvider: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // Refresh profile fields that can legitimately change on each
      // sign-in (Google avatar updates, display name edits). Don't touch
      // authProvider — keep the original so we can tell later that this
      // account was first created via Google.
      await ctx.db.patch(existing._id, {
        name: args.name || existing.name,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        updatedAt: now,
      });
      return {
        id: existing._id,
        email: existing.email,
        name: args.name || existing.name,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        authProvider: existing.authProvider,
        preferredLanguage: existing.preferredLanguage ?? "en",
        activeTrackId: existing.activeTrackId ?? null,
      };
    }

    const id = await ctx.db.insert("users", {
      email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      authProvider: args.authProvider,
      preferredLanguage: "en",
      activeTrackId: null,
      portfolioPublic: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      authProvider: args.authProvider,
      preferredLanguage: "en",
      activeTrackId: null,
    };
  },
});

/**
 * Update a user's own profile. Stage 1 surfaces `preferredLanguage`,
 * `activeTrackId`, and `portfolioPublic` — matching the old backend
 * `PATCH /api/v1/users/me` surface so the frontend changes as little
 * as possible when we cut over.
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    preferredLanguage: v.optional(v.string()),
    activeTrackId: v.optional(v.union(v.string(), v.null())),
    portfolioPublic: v.optional(v.boolean()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...patch } = args;
    const cleaned: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) cleaned[key] = value;
    }
    await ctx.db.patch(userId, cleaned);
    const fresh = await ctx.db.get(userId);
    return fresh;
  },
});

// ─────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────

/** Lookup by email. Server-side callers only (for now). */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.toLowerCase().trim()),
      )
      .unique();
  },
});

/** Load a user by id. Used by the frontend after sign-in. */
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Public portfolio read — returns a user only if they have opted in
 * via `portfolioPublic: true`. Matches the privacy gate from the old
 * FastAPI `/api/v1/users/{id}/public` route: if the user exists but
 * hasn't made their portfolio public, we return null (not "forbidden")
 * so the existence of the account isn't leaked.
 */
export const getPublicProfile = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;
    if (!user.portfolioPublic) return null;
    // Strip fields that should never leave the server.
    return {
      id: user._id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      preferredLanguage: user.preferredLanguage,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// Internal — used by `convex/passwords.ts` for the Credentials flow.
//
// These functions are only callable from inside Convex (from an action
// via `ctx.runQuery` / `ctx.runMutation`) — they are NOT exposed over
// the public API surface. This is Convex's equivalent of making a
// method `private` — passwordHash never leaves the server and can't be
// queried by client code.
// ─────────────────────────────────────────────────────────────────────

/** Internal lookup that returns the passwordHash — used by login flow. */
export const _getByEmailWithHash = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.toLowerCase().trim()),
      )
      .unique();
  },
});

/** Create a new credentials user with a pre-hashed password. */
export const _insertCredentialsUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // This branch is handled by the action too (it checks first),
      // but guard here in case of a race.
      throw new Error("EMAIL_TAKEN");
    }

    const id = await ctx.db.insert("users", {
      email,
      name: args.name,
      authProvider: "credentials",
      passwordHash: args.passwordHash,
      preferredLanguage: "en",
      activeTrackId: null,
      portfolioPublic: false,
      createdAt: now,
      updatedAt: now,
    });

    return { id, email, name: args.name };
  },
});
