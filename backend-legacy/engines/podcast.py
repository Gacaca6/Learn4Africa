"""
Learn4Africa — Podcast Generator Engine
Converts lesson content into engaging audio conversations.
Uses Edge TTS (free, by Microsoft) — no API key required.
Supports African languages: Swahili, Hausa, Yoruba, Amharic, and more.
"""

import os
import uuid
import json
import asyncio

import edge_tts

from engines.llm import chat
from engines.mwalimu import wrap_prompt
from config import settings

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media", "podcasts")
os.makedirs(MEDIA_DIR, exist_ok=True)

# Voice mapping — prioritizing African language voices and warm, clear speakers
VOICE_MAP = {
    "en": {"host": "en-KE-AsiliaNeural", "guest": "en-NG-AbeoNeural"},       # Kenya + Nigeria
    "sw": {"host": "sw-KE-ZuriNeural", "guest": "sw-TZ-DaudiNeural"},         # Swahili
    "fr": {"host": "fr-CM-AntoineNeural", "guest": "fr-SN-AissatouNeural"},    # Cameroon + Senegal (added a proxy)
    "ar": {"host": "ar-EG-SalmaNeural", "guest": "ar-SA-HamedNeural"},         # Egypt + Saudi
    "am": {"host": "am-ET-MekdesNeural", "guest": "am-ET-AmehaNeural"},        # Amharic (Ethiopia)
    "ha": {"host": "en-NG-AbeoNeural", "guest": "en-NG-EzinneNeural"},         # Hausa (fallback to Nigerian English)
    "yo": {"host": "en-NG-AbeoNeural", "guest": "en-NG-EzinneNeural"},         # Yoruba (fallback to Nigerian English)
    "zu": {"host": "zu-ZA-ThandoNeural", "guest": "zu-ZA-ThembaNeural"},       # Zulu
    "ig": {"host": "en-NG-AbeoNeural", "guest": "en-NG-EzinneNeural"},         # Igbo (fallback)
    "rw": {"host": "en-KE-AsiliaNeural", "guest": "en-KE-ChilembaNeural"},     # Kinyarwanda (fallback to Kenyan English)
}


async def generate_podcast_script(
    lesson_content: str,
    lesson_title: str,
    language: str = "en",
    age_group: str = "general",
) -> list[dict]:
    """
    Generate a conversational podcast script from lesson content.
    Two speakers: Host (teacher) and Guest (curious learner asking great questions).
    """
    engine_instructions = f"""You are writing a two-person podcast script.
Language: {language}.

The podcast has two speakers:
- HOST (Amina): A warm, knowledgeable teacher who explains things clearly with African examples
- GUEST (Kofi): A curious learner who asks the questions the audience is thinking

Rules:
- Make it conversational and natural — not a lecture
- Kofi should ask "why" and "how" and real-world application questions
- Amina should use stories, analogies, and examples from African life
- Keep each speaking turn to 2-4 sentences maximum
- Include moments of humor and warmth
- Total: 12-18 speaking turns
- Return ONLY valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=lesson_title, language=language, age_group=age_group)

    prompt = f"""Write a podcast script for the lesson: "{lesson_title}"

Content to teach:
{lesson_content}

Respond in JSON format:
[
  {{"speaker": "host", "text": "Welcome to Learn4Africa! Today we're exploring..."}},
  {{"speaker": "guest", "text": "I've always wondered about that! Can you explain..."}},
  ...
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
            return json.loads(response[start:end])
        raise ValueError("Failed to parse podcast script")


async def generate_podcast_audio(
    script: list[dict],
    language: str = "en",
) -> str:
    """
    Convert a podcast script to audio using Edge TTS (free).
    Returns the file path of the generated MP3.
    """
    voices = VOICE_MAP.get(language, VOICE_MAP["en"])
    segments = []
    podcast_id = str(uuid.uuid4())[:8]

    for i, turn in enumerate(script):
        voice = voices["host"] if turn["speaker"] == "host" else voices["guest"]
        segment_path = os.path.join(MEDIA_DIR, f"_seg_{podcast_id}_{i}.mp3")

        communicate = edge_tts.Communicate(turn["text"], voice)
        await communicate.save(segment_path)
        segments.append(segment_path)

    # Combine segments into one file
    output_path = os.path.join(MEDIA_DIR, f"podcast_{podcast_id}.mp3")
    await _combine_audio_segments(segments, output_path)

    # Clean up segments
    for seg in segments:
        if os.path.exists(seg):
            os.remove(seg)

    return f"/media/podcasts/podcast_{podcast_id}.mp3"


async def _combine_audio_segments(segments: list[str], output_path: str):
    """Combine multiple MP3 segments into one file using pydub."""
    from pydub import AudioSegment

    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=500)  # 0.5s pause between speakers

    for seg_path in segments:
        segment = AudioSegment.from_mp3(seg_path)
        combined += segment + pause

    combined.export(output_path, format="mp3")
