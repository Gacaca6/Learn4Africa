/**
 * Learn4Africa — visual explanations.
 *
 * Two complementary actions:
 *   - generateDiagram: returns raw Mermaid.js syntax (the frontend
 *     renders it with mermaid's JS client). Mermaid handles flowcharts,
 *     sequence diagrams, mindmaps, ER diagrams, and class diagrams.
 *   - generateVisualExplanation: returns a standalone HTML/CSS card.
 *     Used for concepts where a diagram isn't the right shape.
 *
 * Both keep the output small and self-contained — no external JS, no
 * external fonts. Designed to drop straight into a React component.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { askClaude } from "../lib/claude";
import { mwalimuSystem } from "../lib/mwalimu";

export const generateDiagram = action({
  args: {
    concept: v.string(),
    diagramType: v.union(
      v.literal("flowchart"),
      v.literal("sequence"),
      v.literal("mindmap"),
      v.literal("erDiagram"),
      v.literal("classDiagram"),
    ),
    africanContext: v.optional(v.boolean()),
  },
  handler: async (_, args) => {
    const system = mwalimuSystem(`
You generate Mermaid.js diagram syntax for educational content.
Return ONLY valid Mermaid syntax — no explanation, no markdown fences, just the diagram code.
The diagram must be clear and educational.
`);

    const contextNote = args.africanContext
      ? "Use African names and contexts in labels where appropriate."
      : "";

    const user = `
Create a ${args.diagramType} diagram explaining: ${args.concept}
${contextNote}

Return only valid Mermaid.js syntax that will render correctly.
Keep it simple enough for a beginner to understand.
Maximum 10 nodes or steps.
`;

    const diagram = await askClaude(system, user, 512);
    return { diagram: diagram.trim() };
  },
});

export const generateVisualExplanation = action({
  args: {
    concept: v.string(),
    moduleTitle: v.string(),
  },
  handler: async (_, args) => {
    const system = mwalimuSystem(`
You generate simple, clean HTML with inline CSS for visual learning cards.
The HTML must work standalone — no external dependencies.
Use only inline styles. No JavaScript.
Colors must work on both light and dark backgrounds.
Return ONLY the HTML — no explanation, no markdown.
`);

    const user = `
Create a visual learning card for this concept: ${args.concept}
Module: ${args.moduleTitle}

The card should show:
1. The concept name prominently
2. A simple visual representation using HTML shapes and CSS
3. Key points as a clean list
4. An African analogy in a highlighted box

Use warm colors (oranges, greens) that feel African and welcoming.
Maximum 300px tall. Clean, simple, educational.
Return only the HTML.
`;

    const html = await askClaude(system, user, 1024);
    return { html: html.trim() };
  },
});
