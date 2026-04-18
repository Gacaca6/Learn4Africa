/**
 * Learn4Africa — learner progress (per track).
 *
 * Every mutation here is idempotent and takes `userId` explicitly.
 *
 * Security note (Stage 2): mutations trust the caller to pass the
 * correct `userId`. The frontend reads `session.user.id` from NextAuth
 * (populated in Stage 1's `auth.ts` from Convex) and passes it through.
 * In a later stage we install Convex's auth adapter so `ctx.auth`
 * returns the signed-in identity directly and we can drop the `userId`
 * argument here. Until then, don't expose these mutations to untrusted
 * code paths.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────
// Internal helper — upsert-or-get the progress row for (user, track).
// ─────────────────────────────────────────────────────────────────────

async function getOrCreateProgress(
  ctx: { db: any },
  userId: any,
  trackId: string,
) {
  const existing = await ctx.db
    .query("progress")
    .withIndex("by_user_track", (q: any) =>
      q.eq("userId", userId).eq("trackId", trackId),
    )
    .unique();

  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("progress", {
    userId,
    trackId,
    startedAt: now,
    lastActivityAt: now,
    completedModules: [],
    quizScores: [],
    portfolio: [],
  });
  return await ctx.db.get(id);
}

// ─────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────

/** Mark a track as started — creates the progress row if missing. */
export const startTrack = mutation({
  args: { userId: v.id("users"), trackId: v.string() },
  handler: async (ctx, { userId, trackId }) => {
    const progress = await getOrCreateProgress(ctx, userId, trackId);
    // Touch lastActivityAt so "recent tracks" lists stay meaningful.
    await ctx.db.patch(progress._id, { lastActivityAt: Date.now() });

    // Also update the user's activeTrackId so TopNav / other UI can
    // jump back to the last-opened track.
    await ctx.db.patch(userId, {
      activeTrackId: trackId,
      updatedAt: Date.now(),
    });

    return progress._id;
  },
});

/** Push a module number onto the completedModules array (deduped). */
export const completeModule = mutation({
  args: {
    userId: v.id("users"),
    trackId: v.string(),
    moduleNumber: v.number(),
  },
  handler: async (ctx, { userId, trackId, moduleNumber }) => {
    const progress = await getOrCreateProgress(ctx, userId, trackId);
    const completed = new Set(progress.completedModules);
    completed.add(moduleNumber);
    await ctx.db.patch(progress._id, {
      completedModules: Array.from(completed).sort((a, b) => a - b),
      lastActivityAt: Date.now(),
    });
    return progress._id;
  },
});

/** Append a quiz attempt. Keeps the full history — UI picks best/latest. */
export const recordQuizScore = mutation({
  args: {
    userId: v.id("users"),
    trackId: v.string(),
    moduleNumber: v.number(),
    score: v.number(),
    total: v.number(),
  },
  handler: async (ctx, { userId, trackId, moduleNumber, score, total }) => {
    const progress = await getOrCreateProgress(ctx, userId, trackId);
    const quizScores = [
      ...progress.quizScores,
      { moduleNumber, score, total, takenAt: Date.now() },
    ];
    await ctx.db.patch(progress._id, {
      quizScores,
      lastActivityAt: Date.now(),
    });
  },
});

/** Add a project to the learner's portfolio for this track. */
export const addPortfolioItem = mutation({
  args: {
    userId: v.id("users"),
    trackId: v.string(),
    moduleNumber: v.number(),
    projectName: v.string(),
    description: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    techStack: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, trackId, ...rest } = args;
    const progress = await getOrCreateProgress(ctx, userId, trackId);
    const portfolio = [
      ...progress.portfolio,
      { ...rest, createdAt: Date.now() },
    ];
    await ctx.db.patch(progress._id, {
      portfolio,
      lastActivityAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────

/** My progress on a specific track, or null if I haven't started it. */
export const getMyProgress = query({
  args: { userId: v.id("users"), trackId: v.string() },
  handler: async (ctx, { userId, trackId }) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_user_track", (q) =>
        q.eq("userId", userId).eq("trackId", trackId),
      )
      .unique();
  },
});

/** All progress rows for a user — used by the portfolio page. */
export const listMine = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
