// Development utility — shows which AI provider is active.
// This is never shown to students. Only visible in dev tools
// and Convex dashboard logs.

export function logProviderInfo() {
  const provider = process.env.AI_PROVIDER ?? "claude";
  const isTemporary = provider === "gemini";

  console.log(
    [
      "─────────────────────────────────────",
      `Learn4Africa AI Provider: ${provider.toUpperCase()}`,
      isTemporary
        ? "STATUS: TEMPORARY (hackathon fallback)"
        : "STATUS: PRODUCTION",
      isTemporary
        ? "ACTION NEEDED: Set AI_PROVIDER=claude when credits available"
        : "No action needed",
      "─────────────────────────────────────",
    ].join("\n"),
  );
}
