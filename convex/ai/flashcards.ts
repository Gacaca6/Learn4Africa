/**
 * Learn4Africa — flashcard generation.
 *
 * Produces a mix of card types (definition, application, comparison,
 * "why it matters") so the review session builds real understanding
 * instead of surface recall.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaudeJSON } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const generateFlashcards = action({
  args: {
    topic: v.string(),
    moduleTitle: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const count = args.count ?? 8;

    const system = mwalimuSystem(`
You create flashcards that build genuine understanding.
Front: a concept or question the student must be able to answer
Back: a clear explanation using African analogies where helpful
You must respond with valid JSON only.
`);

    const user = `
Create ${count} flashcards for: ${args.moduleTitle}
Topic: ${args.topic}

Return this exact JSON:
{
  "flashcards": [
    {
      "front": "concept or question",
      "back": "clear explanation — use African analogy if it makes it clearer",
      "africanAnalogy": "optional: a specifically African way to remember this",
      "interviewUse": "how knowing this helps in a job interview"
    }
  ]
}

Mix of card types:
- Definition cards (what is X)
- Application cards (when would you use X)
- Comparison cards (difference between X and Y)
- Why cards (why does X matter for African developers)

Return ONLY the JSON object. Begin with { and end with }.
`;

    return await askClaudeJSON(system, user, 1024);
  },
});
