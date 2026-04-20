/**
 * Learn4Africa — Mwalimu tutor chat.
 *
 * Multi-turn conversation with the student. The caller passes the full
 * history each time (client-side or from the `conversations` table) —
 * actions are stateless by design.
 *
 * Routes through `askClaudeChat` so the underlying provider (Claude or
 * the temporary Gemini fallback) is invisible at this layer.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaudeChat, AI_MAX_TOKENS } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";
import { logProviderInfo } from "../lib/providerInfo";

export const chat = action({
  args: {
    message: v.string(),
    trackId: v.optional(v.string()),
    moduleNumber: v.optional(v.number()),
    moduleTopic: v.optional(v.string()),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    studentName: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (_, args) => {
    logProviderInfo();

    const contextExtra = args.moduleTopic
      ? `CURRENT CONTEXT: The student is studying "${args.moduleTopic}" on the ${args.trackId} track, module ${args.moduleNumber}.
Keep all explanations and examples relevant to this topic.
If they ask about something unrelated, gently redirect.`
      : "";

    const languageExtra =
      args.preferredLanguage === "rw"
        ? "IMPORTANT: The student prefers Kinyarwanda. Respond entirely in Kinyarwanda."
        : "";

    const nameExtra = args.studentName
      ? `The student's name is ${args.studentName}. Use their name occasionally — it builds connection.`
      : "";

    const system = mwalimuSystem(
      [contextExtra, languageExtra, nameExtra].filter(Boolean).join("\n\n"),
    );

    const text = await askClaudeChat(
      system,
      args.conversationHistory,
      args.message,
      AI_MAX_TOKENS,
    );

    return { response: text };
  },
});
