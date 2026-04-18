/**
 * Learn4Africa — Convex database schema.
 *
 * This file defines every persisted table on Convex. When we add new
 * features (tracks, progress, tutor sessions, curricula...) we extend
 * this schema — not a separate Mongo migration, not an ORM model class.
 *
 * Convex runs a type-safe validator over every write. If a mutation
 * tries to insert a field that isn't declared here, it throws at runtime.
 * Schema evolution: you can add optional fields freely; removing or
 * renaming a required field needs a data migration.
 *
 * Stage 1 scope: only `users`. Later stages add:
 *   - tracks / modules
 *   - progress (per-user, per-module)
 *   - curricula (AI-generated learning paths)
 *   - tutorSessions (Mwalimu chat)
 *   - generatedMedia (podcasts / comics / songs)
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ──────────────────────────────────────────────────────────────────
  // users — one row per learner.
  //
  // NextAuth is the source of truth for sign-in; on successful
  // sign-in we call `users.upsertFromOAuth` to create or refresh the
  // row here. The row's `_id` is what we use everywhere else as the
  // user identifier.
  //
  // `email` is indexed (unique-ish — we enforce uniqueness in the
  // mutation) so the upsert is a single lookup.
  // ──────────────────────────────────────────────────────────────────
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),

    // "google" | "credentials" — how they signed in. Useful later for
    // "you signed up with Google, sign in with Google" error messages.
    authProvider: v.string(),

    // UI preferences — mirrored from the Mongo schema so we can move
    // existing code over without reshaping data.
    preferredLanguage: v.optional(v.string()),
    activeTrackId: v.optional(v.union(v.string(), v.null())),
    portfolioPublic: v.optional(v.boolean()),

    // Credentials-provider password hash. Unset for OAuth-only users.
    passwordHash: v.optional(v.string()),

    // Audit timestamps — Convex also gives us `_creationTime` on every
    // row for free, but keeping explicit ones makes the port from the
    // Mongo schema 1:1 and makes analytics easier later.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  // ──────────────────────────────────────────────────────────────────
  // progress — one row per (user, trackId) pair.
  //
  // Stored as a single document with denormalised arrays (completed
  // modules, quiz scores, portfolio items) rather than separate rows
  // because:
  //   1. A single user rarely goes past ~100 modules / quiz attempts
  //      per track — well within Convex's 1 MB/document limit.
  //   2. Reading "my progress on this track" is one lookup, not a join.
  //   3. The frontend's zustand store already treats progress as a
  //      single object per track — the schema mirrors that shape.
  //
  // `trackId` is a plain string (e.g. "python_data") because track
  // content itself lives in the Next.js bundle, not in Convex. See
  // `lib/tracks/index.ts`.
  // ──────────────────────────────────────────────────────────────────
  progress: defineTable({
    userId: v.id("users"),
    trackId: v.string(),

    startedAt: v.number(),
    lastActivityAt: v.number(),

    // Module numbers the learner has marked complete (1-indexed, per
    // the track JSON's `module_number` field).
    completedModules: v.array(v.number()),

    // History of quiz attempts across all modules in this track.
    quizScores: v.array(
      v.object({
        moduleNumber: v.number(),
        score: v.number(),
        total: v.number(),
        takenAt: v.number(),
      }),
    ),

    // Portfolio entries contributed while going through the track.
    portfolio: v.array(
      v.object({
        moduleNumber: v.number(),
        projectName: v.string(),
        description: v.optional(v.string()),
        githubUrl: v.optional(v.string()),
        liveUrl: v.optional(v.string()),
        techStack: v.optional(v.array(v.string())),
        createdAt: v.number(),
      }),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_track", ["userId", "trackId"]),
});
