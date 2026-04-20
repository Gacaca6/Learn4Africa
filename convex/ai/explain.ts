/**
 * Learn4Africa — module explanations.
 *
 * Produces the opening "here is what this module is about" text that
 * students see when they open a module. Structured output (5 fixed
 * sections) so the frontend can render it consistently.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaude } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const explainModule = action({
  args: {
    moduleTitle: v.string(),
    moduleTopic: v.string(),
    trackId: v.string(),
    studentName: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const languageExtra =
      args.preferredLanguage === "rw"
        ? "Respond entirely in Kinyarwanda."
        : "";

    const system = mwalimuSystem(languageExtra);

    const user = `
Explain this learning module to a student in Africa who wants a tech job:

Module: ${args.moduleTitle}
Track: ${args.trackId}
Topic area: ${args.moduleTopic}
${args.studentName ? `Student name: ${args.studentName}` : ""}

Your explanation must follow this exact structure:

1. AFRICAN HOOK (1 sentence)
   Connect this concept to something they see daily in Rwanda/Africa.
   Example format: "When you [common African activity], [this concept] is working behind the scenes."

2. WHAT THIS IS (2-3 sentences)
   Plain explanation. No jargon without definition.
   Use the bridge method — connect to something they already know.

3. CONCRETE EXAMPLE (code or scenario)
   Show a real example using African names, companies, and contexts.
   Not: user = {name: "John", city: "New York"}
   Yes: student = {name: "Kalisa", district: "Nyarugenge", university: "UR-CST"}

4. WHY EMPLOYERS CARE (1-2 sentences)
   Specifically what Rwandan/African employers test about this.
   Name real companies if relevant: BK Tech, MTN, Irembo, Andela.

5. WHAT YOU WILL BUILD
   One sentence about the practice exercise and why it impresses employers.

Length: 300-400 words total.
Tone: Knowledgeable elder who respects the student's intelligence completely.
`;

    return { explanation: await askClaude(system, user, 1024) };
  },
});
