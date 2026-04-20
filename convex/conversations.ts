/**
 * Learn4Africa — Mwalimu conversation persistence.
 *
 * Every user/assistant exchange in the tutor and interview rooms is
 * appended here so a learner's chat history survives page reloads and
 * device switches. The schema keeps one row per conversation (tutor,
 * interview, explain) identified by the (userId, trackId?, moduleNumber?)
 * tuple — the handler upserts into that row on every save.
 *
 * Security note (matches convex/progress.ts): mutations trust the caller
 * to pass the correct userId. The frontend reads session.user.id from
 * NextAuth. Until Convex's auth adapter is wired up, don't expose these
 * mutations to untrusted code paths.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────
// Shared message shape
// ─────────────────────────────────────────────────────────────────────

const messageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
});

async function findConversation(
  ctx: { db: any },
  userId: any,
  type: "tutor" | "interview" | "explain",
  trackId: string | undefined,
  moduleNumber: number | undefined,
) {
  const rows = await ctx.db
    .query("conversations")
    .withIndex("by_user_module", (q: any) =>
      q
        .eq("userId", userId)
        .eq("trackId", trackId)
        .eq("moduleNumber", moduleNumber),
    )
    .collect();
  return rows.find((r: any) => r.type === type) ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────

/**
 * Append one user→assistant exchange to a conversation. Creates the
 * conversation row on first turn.
 */
export const appendExchange = mutation({
  args: {
    // Loose string so stale JWTs (carrying a pre-Convex UUID) don't
    // hit the validator wall. We normalize below — writes with a
    // non-Convex id simply no-op instead of crashing the request.
    userId: v.string(),
    type: v.union(
      v.literal("tutor"),
      v.literal("interview"),
      v.literal("explain"),
    ),
    trackId: v.optional(v.string()),
    moduleNumber: v.optional(v.number()),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId) return null;
    const now = Date.now();
    const newMessages = [
      { role: "user" as const, content: args.userMessage, timestamp: now },
      {
        role: "assistant" as const,
        content: args.assistantMessage,
        timestamp: now + 1,
      },
    ];

    const existing = await findConversation(
      ctx,
      userId,
      args.type,
      args.trackId,
      args.moduleNumber,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: [...existing.messages, ...newMessages],
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("conversations", {
      userId,
      type: args.type,
      trackId: args.trackId,
      moduleNumber: args.moduleNumber,
      messages: newMessages,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Overwrite a conversation's full message list. Used when the client
 * sends the canonical history (e.g. after reloading from cache). */
export const saveConversation = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("tutor"),
      v.literal("interview"),
      v.literal("explain"),
    ),
    trackId: v.optional(v.string()),
    moduleNumber: v.optional(v.number()),
    messages: v.array(messageValidator),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId) return null;
    const now = Date.now();
    const existing = await findConversation(
      ctx,
      userId,
      args.type,
      args.trackId,
      args.moduleNumber,
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("conversations", {
      userId,
      type: args.type,
      trackId: args.trackId,
      moduleNumber: args.moduleNumber,
      messages: args.messages,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────

/** Load one conversation (e.g. the tutor thread for a given module). */
export const getConversation = query({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("tutor"),
      v.literal("interview"),
      v.literal("explain"),
    ),
    trackId: v.optional(v.string()),
    moduleNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId) return null;
    return await findConversation(
      ctx,
      userId,
      args.type,
      args.trackId,
      args.moduleNumber,
    );
  },
});

/** List every conversation a user has — used by a future "history" UI. */
export const listMine = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId: rawUserId }) => {
    const userId = ctx.db.normalizeId("users", rawUserId);
    if (!userId) return [];
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
