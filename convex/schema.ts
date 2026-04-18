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
    // Populated in Stage 2 when we port the email/password flow.
    passwordHash: v.optional(v.string()),

    // Audit timestamps — Convex also gives us `_creationTime` on every
    // row for free, but keeping explicit ones makes the port from the
    // Mongo schema 1:1 and makes analytics easier later.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),
});
