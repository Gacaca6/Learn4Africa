# Switching Learn4Africa from Gemini to Claude

This document exists because Gemini is a TEMPORARY measure.
Learn4Africa is built for Claude. Mwalimu is Claude.
Switch as soon as Anthropic credits are available.

## When to switch
- After receiving Anthropic API credits (hackathon prize or grant)
- Before launching to real students
- Before any press or public announcement

## How to switch (takes 2 minutes)

Step 1: Add credits to your Anthropic account at console.anthropic.com

Step 2: Run these two commands:
  npx convex env set AI_PROVIDER claude
  npx convex env set ANTHROPIC_API_KEY sk-ant-your-key-here

Step 3: Verify the switch worked:
  npx convex env list
  → AI_PROVIDER should show "claude"

Step 4: Optional cleanup (after confirming Claude works):
  npx convex env unset GEMINI_API_KEY
  npm uninstall @google/genai

Step 5: Test one action in Convex dashboard → Functions → ai/tutor:chat
  If Mwalimu responds, the switch is complete.

## What does NOT change when switching
- Mwalimu's identity and personality (identical)
- All Convex action signatures (identical)
- All frontend components (identical)
- Student data and progress (unaffected)
- Everything the student sees (identical)

## What DOES change
- Response quality improves (Claude > Gemini for nuanced teaching)
- Prompt caching activates (60% cost reduction on system prompt)
- You are no longer dependent on Google's free tier limits

## Gemini 2.5 Flash free tier limits
- 5 requests per minute (RPM)
- 250,000 tokens per day
- Approximately 20 requests per day
- Sufficient for: hackathon demo, testing, judge interactions
- Not sufficient for: real students, production traffic
- Solution: switch to Claude (no daily request limits)
