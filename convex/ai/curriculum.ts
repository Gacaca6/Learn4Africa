/**
 * Learn4Africa — AI curriculum designer.
 *
 * Given a student's goal and level, generate a 6-10 module curriculum
 * scoped explicitly toward employment in Africa. Returns structured JSON
 * that the frontend renders directly into a track view.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaudeJSON } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const designCurriculum = action({
  args: {
    goal: v.string(),
    level: v.string(),
    targetWeeks: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const weeks = args.targetWeeks ?? 6;

    const system = mwalimuSystem(`
You are designing a learning curriculum for an African student.
You must respond with valid JSON only — no markdown, no explanation.
The curriculum must be practical, job-focused, and grounded in African context.
Every module must lead directly toward employment in Africa.
`);

    const user = `
Design a ${weeks}-week curriculum for a student who wants to: ${args.goal}
Current level: ${args.level}

Return this exact JSON structure:
{
  "title": "curriculum title",
  "goal": "specific job outcome in Africa",
  "totalWeeks": ${weeks},
  "careerOutcome": "job title they can realistically get in Rwanda/Africa",
  "estimatedSalaryRWF": { "min": 0, "max": 0 },
  "modules": [
    {
      "moduleNumber": 1,
      "title": "module title",
      "description": "one sentence explaining what this covers",
      "youtubeSearchQuery": "specific search query to find the best free tutorial",
      "practiceExercise": "specific hands-on task the student must complete",
      "interviewQuestion": "one real interview question employers ask about this",
      "estimatedHours": 4,
      "week": 1
    }
  ]
}

Design EXACTLY 6 modules.
Make youtubeSearchQuery specific — include channel names like freeCodeCamp or Traversy Media.
Make practiceExercise concrete and African-contextualised.

Return ONLY the JSON object. Begin with { and end with }.
`;

    // `needsReasoning: true` unlocks Gemini's 1024-token thinking budget
    // for multi-module planning. Every other action stays at budget 0 to
    // protect the 250K-token/day free tier cap.
    // Gemini 2.5 counts thinking tokens against maxOutputTokens. With
     // needsReasoning=true (1024 thinking budget), we need ~1024 for
     // thought + ~1200 for the 6-module JSON payload. 2500 is safe.
     return await askClaudeJSON(system, user, 2500, true);
  },
});
