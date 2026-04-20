/**
 * Learn4Africa — quiz generation.
 *
 * Generates module quizzes as structured JSON. Emphasises application
 * over memorisation and uses African real-world scenarios where they
 * make the question clearer, not as decoration.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaudeJSON } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const generateQuiz = action({
  args: {
    topic: v.string(),
    moduleTitle: v.string(),
    trackId: v.string(),
    difficulty: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const count = args.count ?? 5;
    const difficulty = args.difficulty ?? "beginner";

    const system = mwalimuSystem(`
You generate quiz questions for African learners.
Questions must test real understanding, not memorisation.
Use African examples in questions wherever natural.
You must respond with valid JSON only.
`);

    const user = `
Generate ${count} multiple choice questions about: ${args.moduleTitle}
Topic area: ${args.topic}
Difficulty: ${difficulty}
Track: ${args.trackId}

Return this exact JSON:
{
  "questions": [
    {
      "question": "question text — use African context where natural",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct": "A",
      "explanation": "why this is correct and why the others are wrong — teach, not just confirm",
      "interviewRelevance": "how this concept appears in real job interviews"
    }
  ]
}

Rules:
- Questions test application not just definitions
- At least 2 questions should use African real-world scenarios
- Wrong answers should be plausible, not obviously silly
- Explanations should teach — a student who got it wrong should understand after reading

Return ONLY the JSON object. Begin with { and end with }.
`;

    return await askClaudeJSON(system, user, 1024);
  },
});
