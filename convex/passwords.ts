/**
 * Learn4Africa — email/password authentication actions.
 *
 * Convex splits server functions into three kinds:
 *   - queries: read-only, reactive, run in the deterministic runtime
 *   - mutations: read-write, run in the deterministic runtime
 *   - actions: can call external APIs and use any npm package;
 *     cannot touch `ctx.db` directly (they proxy via runMutation).
 *
 * bcryptjs does CPU-heavy hashing that isn't allowed in the
 * deterministic mutation runtime, so the hash/compare work lives in
 * actions. Actions then call `internalMutation`s in `users.ts` to do
 * the actual database writes.
 *
 * Minimum password policy mirrors the old FastAPI backend:
 *   - length ≥ 12
 *   - at least one letter
 *   - at least one digit
 */

"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const MIN_LENGTH = 12;
const LETTER_RE = /[A-Za-z]/;
const DIGIT_RE = /\d/;

function validatePasswordPolicy(password: string): string | null {
  if (typeof password !== "string") return "Password must be a string.";
  if (password.length < MIN_LENGTH)
    return `Password must be at least ${MIN_LENGTH} characters.`;
  if (!LETTER_RE.test(password))
    return "Password must contain at least one letter.";
  if (!DIGIT_RE.test(password))
    return "Password must contain at least one digit.";
  return null;
}

/**
 * Sign up with email + password. Hashes with bcrypt (cost 10) and
 * inserts a new user row. Errors cases are returned as `{ok: false,
 * error}` instead of thrown — the React caller can render them directly
 * without try/catch noise.
 */
export const signUp = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const name = args.name.trim();

    if (!email.includes("@")) {
      return { ok: false as const, error: "Please enter a valid email." };
    }
    if (!name) {
      return { ok: false as const, error: "Please enter your name." };
    }
    const policyError = validatePasswordPolicy(args.password);
    if (policyError) return { ok: false as const, error: policyError };

    // Is the email taken? Done via internal query so the client can't
    // probe for existence without also trying to register.
    const existing = await ctx.runQuery(internal.users._getByEmailWithHash, {
      email,
    });
    if (existing) {
      return {
        ok: false as const,
        error: "An account with this email already exists.",
      };
    }

    const passwordHash = await bcrypt.hash(args.password, 10);

    const created = await ctx.runMutation(internal.users._insertCredentialsUser, {
      email,
      name,
      passwordHash,
    });

    return {
      ok: true as const,
      user: { id: created.id, email: created.email, name: created.name },
    };
  },
});

/**
 * Verify email + password. Called from the NextAuth Credentials
 * provider's `authorize` function. Returns the user on match, null
 * otherwise. We intentionally return null (not a specific "wrong
 * password" error) to avoid leaking which emails are registered.
 */
export const verify = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const user = await ctx.runQuery(internal.users._getByEmailWithHash, {
      email,
    });
    if (!user || !user.passwordHash) return null;

    let ok = false;
    try {
      ok = await bcrypt.compare(args.password, user.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) return null;

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      preferredLanguage: user.preferredLanguage ?? "en",
      activeTrackId: user.activeTrackId ?? null,
    };
  },
});
