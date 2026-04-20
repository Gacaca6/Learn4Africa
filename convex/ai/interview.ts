/**
 * Learn4Africa — mock interview practice.
 *
 * Multi-turn conversation where Mwalimu plays the role of a Rwandan/
 * African tech interviewer. Honest, specific feedback — never empty
 * praise. Each turn ends with an actionable tip the student can use in
 * a real interview.
 *
 * Routes through `askClaudeChat` — provider-agnostic.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaudeChat, AI_MAX_TOKENS } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const conductInterview = action({
  args: {
    moduleTitle: v.string(),
    studentAnswer: v.string(),
    interviewQuestion: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    studentName: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const system = mwalimuSystem(`
You are conducting a mock technical interview for the module: ${args.moduleTitle}
You play the role of a friendly but rigorous Rwandan/African tech interviewer.
The interview question is: ${args.interviewQuestion}
${args.studentName ? `Student's name: ${args.studentName}.` : ""}

INTERVIEW RULES:
- Ask the interview question clearly first
- Listen to the student's answer
- Give specific, honest feedback — what was good, what was missing
- Never just say "great answer" — always explain WHY it was good or what to add
- If the answer was weak, say so kindly but clearly:
  "That covers part of it. What you are missing is..."
- After feedback, optionally ask a follow-up question to go deeper
- Reference what employers at Rwandan companies actually want to hear
- End each response with one actionable tip for the real interview

TONE: Encouraging but honest. A student who passes your mock interview
should be genuinely ready for a real one.
`);

    const text = await askClaudeChat(
      system,
      args.conversationHistory,
      args.studentAnswer,
      AI_MAX_TOKENS,
    );

    return { response: text };
  },
});
