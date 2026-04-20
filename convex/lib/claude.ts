"use node";

// ─────────────────────────────────────────────────────────────
// Learn4Africa AI Client
// ─────────────────────────────────────────────────────────────
//
// This file is the ONLY place in the codebase that knows which
// AI provider is active. Every other file calls askClaude(),
// askClaudeJSON(), or askClaudeChat() with no knowledge of the
// underlying provider.
//
// TEMPORARY STATE: AI_PROVIDER=gemini (hackathon fallback)
// PRODUCTION TARGET: AI_PROVIDER=claude
//
// To switch to Claude permanently:
//   npx convex env set AI_PROVIDER claude
//   npx convex env set ANTHROPIC_API_KEY sk-ant-...
//
// See PROVIDER_SWITCH.md at the repo root for the full runbook.
// ─────────────────────────────────────────────────────────────

export const AI_MODEL = {
  claude: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
} as const;

export const AI_MAX_TOKENS = 1024;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function activeProvider(): "claude" | "gemini" {
  const raw = (process.env.AI_PROVIDER ?? "claude").toLowerCase();
  return raw === "gemini" ? "gemini" : "claude";
}

// ─── Internal: Claude implementations ───────────────────────

async function askClaude_internal(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Run `npx convex env set ANTHROPIC_API_KEY <key>`.",
    );
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: AI_MODEL.claude,
    max_tokens: maxTokens,
    system: [
      {
        type: "text" as const,
        text: system,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user", content: user }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected Claude response type");
  }
  return block.text;
}

async function askClaudeChat_internal(
  system: string,
  history: ChatMessage[],
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Run `npx convex env set ANTHROPIC_API_KEY <key>`.",
    );
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: AI_MODEL.claude,
    max_tokens: maxTokens,
    system: [
      {
        type: "text" as const,
        text: system,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [...history, { role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected Claude response type");
  }
  return block.text;
}

// ─── Internal: Gemini implementations ───────────────────────
// TEMPORARY — remove when switching back to Claude.

// Gemini 2.5 Flash — free tier via Google AI Studio
// SDK: @google/genai (Google's current SDK)
// Model: gemini-2.5-flash (stable, no date suffix needed)
// Free tier: 5 RPM, 250K tokens/day, ~20 requests/day
// thinkingBudget: 0 for all standard requests
// thinkingBudget: 1024 for curriculum design only
// TEMPORARY — switch to Claude: npx convex env set AI_PROVIDER claude

// Retry wrapper: Gemini 2.5 Flash free tier regularly returns 503
// UNAVAILABLE ("high demand") for a few seconds at a time. Three
// attempts with exponential backoff (1s, 2s, 4s) turns transient
// outages into ~7s slowdowns instead of user-visible errors.
async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? err?.error?.code;
      const retryable = status === 503 || status === 429 || status === 500;
      if (!retryable || attempt === delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

async function askGemini_internal(
  system: string,
  user: string,
  maxTokens: number,
  needsReasoning: boolean = false,
): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY ?? "",
  });

  // @google/genai folds the system prompt into the first user turn.
  // A plain "---" separator keeps Mwalimu's identity block visually
  // distinct from the actual question.
  const fullPrompt = `${system}\n\n---\n\n${user}`;

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: AI_MODEL.gemini,
      contents: fullPrompt,
      config: {
        maxOutputTokens: maxTokens,
        temperature: needsReasoning ? 0.9 : 0.7,
        thinkingConfig: {
          // 0 = no thinking tokens (conserves free tier daily budget)
          // Use for: tutor chat, quiz, flashcards, explanations
          // Only curriculum design uses needsReasoning: true (budget: 1024)
          thinkingBudget: needsReasoning ? 1024 : 0,
        },
      },
    }),
  );

  const text = response.text;
  if (!text) throw new Error("Empty Gemini 2.5 Flash response");
  return text;
}

async function askGeminiChat_internal(
  system: string,
  history: ChatMessage[],
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY ?? "",
  });

  // Build a contents array the new SDK understands. Gemini uses "user"
  // and "model" as role names (not "assistant"). We prepend the system
  // prompt into the first user turn so Mwalimu's identity carries the
  // whole conversation.
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  if (history.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `${system}\n\n---\n\n${userMessage}` }],
    });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: `${system}\n\n---\n\n${history[0].content}` }],
    });
    for (let i = 1; i < history.length; i++) {
      const m = history[i];
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
    contents.push({ role: "user", parts: [{ text: userMessage }] });
  }

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: AI_MODEL.gemini,
      contents,
      config: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        // Chat is always zero-thinking — tutor/interview turns must stay
        // cheap. Reasoning-heavy generation runs through askClaudeJSON
        // with needsReasoning=true instead.
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  );

  const text = response.text;
  if (!text) throw new Error("Empty Gemini 2.5 Flash response");
  return text;
}

// ─── Response cleaner ───────────────────────────────────────
// Strips markdown that Gemini (and occasionally Claude) sneak in
// despite the "no markdown" instruction in the Mwalimu system prompt.
// Only applied to plain-text responses — askClaudeJSON keeps raw
// output so JSON.parse can see code fences it may need to remove.

function cleanResponse(text: string): string {
  return (
    text
      // Remove bold markdown
      .replace(/\*\*/g, "")
      // Remove italic markdown
      .replace(/\*(?!\*)/g, "")
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, "$1")
      // Remove triple backtick code fences
      .replace(/```[\w]*\n?/g, "")
      .replace(/```/g, "")
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Clean up excessive blank lines left behind
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ─── Public API — used by every convex/ai/*.ts file ─────────
// These signatures never change regardless of provider.

export async function askClaude(
  system: string,
  user: string,
  maxTokens: number = AI_MAX_TOKENS,
  needsReasoning: boolean = false,
): Promise<string> {
  if (activeProvider() === "gemini") {
    const geminiResult = await askGemini_internal(
      system,
      user,
      maxTokens,
      needsReasoning,
    );
    return cleanResponse(geminiResult);
  }
  const claudeResult = await askClaude_internal(system, user, maxTokens);
  return cleanResponse(claudeResult);
}

export async function askClaudeJSON<T>(
  system: string,
  user: string,
  maxTokens: number = AI_MAX_TOKENS,
  needsReasoning: boolean = false,
): Promise<T> {
  const jsonSystem =
    system +
    "\n\nCRITICAL: Respond with valid JSON only. " +
    "No markdown code fences. No explanation. No preamble. " +
    "Start your response with { and end with }. " +
    "Raw JSON only.";

  const raw = await askClaude(jsonSystem, user, maxTokens, needsReasoning);

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Strip accidental markdown fences if the model adds them.
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(
        `AI returned invalid JSON. Provider: ${activeProvider()}. ` +
          `Raw response: ${raw.substring(0, 200)}`,
      );
    }
  }
}

/**
 * Multi-turn chat helper — used by the tutor and interview actions.
 * Handles the role-mapping / SDK differences between Claude and Gemini
 * so callers can pass a single unified `{role, content}[]` history.
 */
export async function askClaudeChat(
  system: string,
  history: ChatMessage[],
  userMessage: string,
  maxTokens: number = AI_MAX_TOKENS,
): Promise<string> {
  if (activeProvider() === "gemini") {
    return askGeminiChat_internal(system, history, userMessage, maxTokens);
  }
  return askClaudeChat_internal(system, history, userMessage, maxTokens);
}

// Legacy export — some files may still reference this directly.
export function getClaudeClient() {
  throw new Error(
    "getClaudeClient() is deprecated. Use askClaude(), askClaudeJSON(), " +
      "or askClaudeChat() instead. These work with both Claude and Gemini automatically.",
  );
}
