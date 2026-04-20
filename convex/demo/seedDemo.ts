/**
 * Learn4Africa — demo seed.
 *
 * Populates Amina's account with the exact state the 3-minute judge
 * demo assumes: Web Dev track active, modules 1–3 complete, module 4
 * in progress, two portfolio pieces shipped, and three prior exchanges
 * with Mwalimu already on file.
 *
 * Run once before the presentation:
 *   npx convex run demo/seedDemo:seedDemoState '{"email":"amina@learn4africa.demo"}'
 *
 * Re-running is safe — the mutation wipes Amina's existing progress /
 * conversation rows first and rewrites them, so the demo always looks
 * freshly cinematic.
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

const TRACK_ID = "web_development";
const NOW_MS = () => Date.now();

export const seedDemoState = mutation({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email ?? "amina@learn4africa.demo";
    const now = NOW_MS();

    // ── 1. Upsert the demo user ────────────────────────────────────
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        name: "Amina",
        authProvider: "credentials",
        preferredLanguage: "en",
        activeTrackId: TRACK_ID,
        portfolioPublic: true,
        createdAt: now - 14 * 24 * 60 * 60 * 1000, // 2 weeks ago
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    } else {
      await ctx.db.patch(user._id, {
        name: "Amina",
        activeTrackId: TRACK_ID,
        preferredLanguage: "en",
        updatedAt: now,
      });
      user = await ctx.db.get(user._id);
    }
    if (!user) throw new Error("Failed to upsert demo user");

    // ── 2. Reset and rewrite progress on the web_development track ─
    const existingProgress = await ctx.db
      .query("progress")
      .withIndex("by_user_track", (q) =>
        q.eq("userId", user!._id).eq("trackId", TRACK_ID),
      )
      .unique();

    const progressData = {
      userId: user._id,
      trackId: TRACK_ID,
      startedAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      lastActivityAt: now - 2 * 60 * 60 * 1000, // 2h ago — "recently active"
      completedModules: [1, 2, 3],
      quizScores: [
        { moduleNumber: 1, score: 5, total: 5, takenAt: now - 9 * 86_400_000 },
        { moduleNumber: 2, score: 4, total: 5, takenAt: now - 6 * 86_400_000 },
        { moduleNumber: 3, score: 5, total: 5, takenAt: now - 3 * 86_400_000 },
      ],
      portfolio: [
        {
          moduleNumber: 2,
          projectName: "My Digital Business Card",
          description:
            "Responsive HTML/CSS business card for a Kigali motorcycle-taxi driver. Shareable link, mobile-first layout.",
          githubUrl: "https://github.com/amina-demo/business-card",
          liveUrl: "https://amina-business-card.vercel.app",
          techStack: ["HTML", "CSS"],
          createdAt: now - 6 * 86_400_000,
        },
        {
          moduleNumber: 3,
          projectName: "MTN MoMo Fee Calculator",
          description:
            "Computes real MTN Mobile Money transaction fees for Rwandan amounts. Uses live fee bands — explains the math to the user.",
          githubUrl: "https://github.com/amina-demo/momo-calculator",
          liveUrl: "https://amina-momo.vercel.app",
          techStack: ["HTML", "CSS", "JavaScript"],
          createdAt: now - 3 * 86_400_000,
        },
      ],
    };

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, progressData);
    } else {
      await ctx.db.insert("progress", progressData);
    }

    // ── 3. Wipe + reseed Amina's Mwalimu conversations ─────────────
    const oldConvos = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user!._id))
      .collect();
    for (const c of oldConvos) {
      await ctx.db.delete(c._id);
    }

    // A short prior tutor exchange from the week before — makes
    // Mwalimu feel like a known presence, not a blank box.
    await ctx.db.insert("conversations", {
      userId: user._id,
      type: "tutor",
      trackId: TRACK_ID,
      messages: [
        {
          role: "user",
          content: "Mwalimu, I get confused by CSS flexbox. Can you help?",
          timestamp: now - 5 * 86_400_000,
        },
        {
          role: "assistant",
          content:
            "Muraho Amina! Think of flexbox like arranging chairs at a community meeting. The container is the room, the chairs are your items. justify-content decides how chairs line up along the row, align-items decides their height. Let us try one together — what layout do you want?",
          timestamp: now - 5 * 86_400_000 + 2000,
        },
        {
          role: "user",
          content: "I want three cards side by side, centered on the page.",
          timestamp: now - 5 * 86_400_000 + 60_000,
        },
        {
          role: "assistant",
          content:
            "Vizuri sana. Wrap them in a div with display: flex; justify-content: center; gap: 1rem. That is it. You have just solved a layout problem that used to take Rwandan developers hours in 2012. Try it and show me the result.",
          timestamp: now - 5 * 86_400_000 + 62_000,
        },
      ],
      createdAt: now - 5 * 86_400_000,
      updatedAt: now - 5 * 86_400_000 + 62_000,
    });

    return {
      userId: user._id,
      email,
      trackId: TRACK_ID,
      completedModules: [1, 2, 3],
      portfolioCount: 2,
      conversationsSeeded: 1,
      seededAt: now,
    };
  },
});

/** Wipe the demo user's state so a second demo run starts clean. */
export const resetDemoState = mutation({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email ?? "amina@learn4africa.demo";
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return { wiped: false };

    const progressRows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of progressRows) await ctx.db.delete(p._id);

    const convoRows = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of convoRows) await ctx.db.delete(c._id);

    return { wiped: true, userId: user._id };
  },
});
