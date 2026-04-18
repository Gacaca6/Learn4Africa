"""
Learn4Africa — Unified LLM Client
Supports Ollama (free, local), OpenAI, and Anthropic.
Ollama is the default — no API costs, runs on any machine.

IMPORTANT: Some Ollama cloud models (like glm-4.6) return content in
the 'reasoning' field instead of 'content'. This client handles both.
"""

import httpx
from openai import AsyncOpenAI

from config import settings


async def chat(
    messages: list[dict],
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """
    Send a chat request to the configured LLM provider.
    Returns the assistant's response text.
    """
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    if settings.ai_provider == "ollama":
        return await _ollama_chat(messages, temperature, max_tokens)
    elif settings.ai_provider == "openai":
        return await _openai_chat(messages, temperature, max_tokens)
    elif settings.ai_provider == "anthropic":
        return await _anthropic_chat(messages, system_prompt, temperature, max_tokens)
    else:
        raise ValueError(f"Unknown AI provider: {settings.ai_provider}")


async def _ollama_chat(
    messages: list[dict], temperature: float, max_tokens: int
) -> str:
    """
    Free, local AI via Ollama — uses raw HTTP to handle quirky model responses.
    Some cloud models (glm-4.6) put answers in 'reasoning' instead of 'content'.
    We call the /v1/chat/completions endpoint and extract the answer from wherever it is.
    """
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/v1/chat/completions",
            headers={"Content-Type": "application/json"},
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()

        # Extract the message
        msg = data["choices"][0]["message"]

        # Some models put the answer in 'content', others in 'reasoning'
        content = msg.get("content", "") or ""
        reasoning = msg.get("reasoning", "") or ""

        # Use content if available, fall back to reasoning
        result = content.strip() if content.strip() else reasoning.strip()

        if not result:
            raise ValueError("Model returned empty response — both content and reasoning are empty")

        return result


async def _openai_chat(
    messages: list[dict], temperature: float, max_tokens: int
) -> str:
    """OpenAI API (paid)."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def _anthropic_chat(
    messages: list[dict],
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """Anthropic Claude API (paid)."""
    # Filter out system messages — Anthropic uses a separate system param
    filtered = [m for m in messages if m["role"] != "system"]
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": filtered,
            },
        )
        response.raise_for_status()
        return response.json()["content"][0]["text"]
