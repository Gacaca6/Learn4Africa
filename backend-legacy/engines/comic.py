"""
Learn4Africa — Comic Generator Engine
Converts lesson content into visual comic panels.

Image generation options:
1. Hugging Face Inference API — free tier, no API key needed for public models
2. Local Stable Diffusion — free, runs on your machine
3. Placeholder — fallback when no image provider is available
"""

import os
import json
import uuid

import httpx

from engines.llm import chat
from engines.mwalimu import wrap_prompt
from config import settings

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media", "comics")
os.makedirs(MEDIA_DIR, exist_ok=True)

# Free Hugging Face models that work without an API key
HF_FREE_MODELS = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
]


async def generate_comic_script(
    lesson_content: str,
    lesson_title: str,
    language: str = "en",
    age_group: str = "general",
    num_panels: int = 6,
) -> list[dict]:
    """
    Generate a comic script with panel descriptions and dialogue.
    """
    engine_instructions = f"""You are a comic book writer.
Language: {language}.

Characters:
- Nia: A bright, curious girl (main character) with braids and a yellow school uniform
- Babu: A wise grandfather with white hair and a warm smile
- Zuri: Nia's best friend, a boy with glasses who loves science

Rules:
- Every comic TEACHES a concept through a visual story
- Set stories in African contexts: villages, markets, schools, nature, cities
- Characters should be expressive and relatable
- Dialogue should be short (speech bubbles need to be brief)
- End with Nia having an "aha!" moment that summarizes the lesson
- Include visual metaphors to explain abstract concepts
- Return ONLY valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=lesson_title, language=language, age_group=age_group)

    prompt = f"""Create a {num_panels}-panel educational comic for: "{lesson_title}"

Content to teach:
{lesson_content[:2000]}

Respond ONLY with a JSON array, no other text:
[
  {{
    "panel": 1,
    "scene_description": "Detailed visual description for image generation (include characters, setting, action, expressions)",
    "dialogue": [
      {{"character": "Nia", "text": "Speech bubble text"}},
      {{"character": "Babu", "text": "Speech bubble text"}}
    ],
    "caption": "Optional narrator text at top/bottom of panel"
  }}
]"""

    response = await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.8,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start != -1 and end > start:
            raw = response[start:end]
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                # Fix common LLM JSON issues: trailing commas, unescaped quotes
                import re
                fixed = re.sub(r',\s*([}\]])', r'\1', raw)  # remove trailing commas
                return json.loads(fixed)
        raise ValueError("Failed to parse comic script")


async def generate_panel_image(scene_description: str, panel_number: int) -> str:
    """
    Generate a single comic panel image.
    Tries Hugging Face free tier first, falls back gracefully.
    """
    comic_id = str(uuid.uuid4())[:8]
    filename = f"panel_{comic_id}_{panel_number}.png"
    filepath = os.path.join(MEDIA_DIR, filename)

    prompt = (
        "Educational comic panel, African characters, children's book illustration, "
        "vibrant colors, warm lighting, simple clean art style, "
        f"digital art: {scene_description}"
    )

    if settings.image_provider == "huggingface":
        success = await _generate_with_hf(prompt, filepath)
        if success:
            return f"/media/comics/{filename}"

    if settings.image_provider == "local":
        try:
            await _generate_with_sd(prompt, filepath)
            return f"/media/comics/{filename}"
        except Exception:
            pass

    # Fallback: return a placeholder path (frontend should handle missing images)
    return ""


async def _generate_with_hf(prompt: str, filepath: str) -> bool:
    """
    Generate image using Hugging Face Inference API.
    Tries multiple free models in order until one works.
    Works WITHOUT an API key for public models (rate-limited but functional).
    With a key, you get higher rate limits.
    """
    headers = {"Content-Type": "application/json"}
    if settings.hf_api_token:
        headers["Authorization"] = f"Bearer {settings.hf_api_token}"

    for model in HF_FREE_MODELS:
        try:
            print(f"[Comic] Trying HF model: {model}")
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"https://router.huggingface.co/hf-inference/models/{model}",
                    headers=headers,
                    json={"inputs": prompt},
                )

                print(f"[Comic] {model} -> status={response.status_code}, size={len(response.content)}")

                if response.status_code == 200 and len(response.content) > 1000:
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                    return True

                # Model might be loading — check for retry header
                if response.status_code == 503:
                    continue  # Try next model

        except Exception as e:
            print(f"[Comic] {model} error: {e}")
            continue

    return False


async def _generate_with_sd(prompt: str, filepath: str):
    """Generate image using local Stable Diffusion API."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.sd_api_url}/sdapi/v1/txt2img",
            json={
                "prompt": prompt,
                "negative_prompt": "nsfw, violent, scary, dark, realistic photo",
                "steps": 25,
                "width": 768,
                "height": 512,
                "cfg_scale": 7,
            },
        )
        response.raise_for_status()
        import base64
        img_data = base64.b64decode(response.json()["images"][0])
        with open(filepath, "wb") as f:
            f.write(img_data)


async def generate_full_comic(
    lesson_content: str,
    lesson_title: str,
    language: str = "en",
    age_group: str = "general",
) -> list[dict]:
    """
    Generate a complete comic: script + images for all panels.
    """
    script = await generate_comic_script(
        lesson_content, lesson_title, language, age_group
    )

    panels = []
    for panel in script:
        image_url = await generate_panel_image(
            panel["scene_description"], panel["panel"]
        )
        panels.append({
            "panel": panel["panel"],
            "image_url": image_url,
            "dialogue": panel["dialogue"],
            "caption": panel.get("caption", ""),
        })

    return panels
