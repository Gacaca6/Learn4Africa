"""
Learn4Africa — Educational Song Generator Engine
Creates catchy, educational songs from lesson content.
Uses Edge TTS for singing voice synthesis (free).
For full music generation, integrates with YuE (local, requires GPU).
"""

import os
import uuid
import json

import edge_tts

from engines.llm import chat
from engines.mwalimu import wrap_prompt
from config import settings

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media", "songs")
os.makedirs(MEDIA_DIR, exist_ok=True)


async def generate_song_lyrics(
    lesson_content: str,
    lesson_title: str,
    language: str = "en",
    age_group: str = "general",
    style: str = "afrobeats",
) -> dict:
    """
    Generate educational song lyrics from lesson content.
    Styles: afrobeats, highlife, bongo_flava, hip_hop, folk, lullaby
    """
    style_descriptions = {
        "afrobeats": "an upbeat Afrobeats song with a catchy chorus — think Burna Boy meets education",
        "highlife": "a smooth Highlife melody — warm, rhythmic, and storytelling",
        "bongo_flava": "a Bongo Flava track — Tanzanian hip-hop with Swahili flavor",
        "hip_hop": "an educational hip-hop track — clever rhymes that teach",
        "folk": "a traditional African folk song — call and response style, community singing",
        "lullaby": "a gentle lullaby that teaches — soft, memorable, and comforting",
    }

    engine_instructions = f"""You are a songwriter who writes songs that teach.
Every line must be educational AND catchy.
Language: {language}.

Rules:
- The chorus must contain the KEY concept of the lesson — repeated for memorization
- Verses break down the concept into memorable pieces
- Use rhyme schemes that make the content stick
- Include call-and-response sections where possible (great for classrooms)
- The song should be singable by children — not too fast, not too complex
- Make it FUN — children should WANT to sing this again
- Return ONLY valid JSON as specified in the user prompt."""

    system_prompt = wrap_prompt(engine_instructions, topic=lesson_title, language=language, age_group=age_group)

    prompt = f"""Write {style_descriptions.get(style, style_descriptions['afrobeats'])} for the lesson: "{lesson_title}"

Content to teach:
{lesson_content[:2000]}

Respond in JSON:
{{
  "title": "Song title",
  "style": "{style}",
  "bpm": 95,
  "structure": [
    {{
      "section": "intro",
      "lyrics": "Opening lines...",
      "instruction": "Spoken softly, building up"
    }},
    {{
      "section": "verse1",
      "lyrics": "First verse lyrics...",
      "instruction": "Rhythmic, teaching the first concept"
    }},
    {{
      "section": "chorus",
      "lyrics": "Catchy chorus that summarizes the lesson...",
      "instruction": "Everyone sings together — call and response"
    }},
    {{
      "section": "verse2",
      "lyrics": "Second verse...",
      "instruction": "Deeper into the topic"
    }},
    {{
      "section": "chorus",
      "lyrics": "Same chorus...",
      "instruction": "Repeat — this is what they'll remember"
    }},
    {{
      "section": "bridge",
      "lyrics": "Bridge lyrics — the 'aha' moment...",
      "instruction": "Slower, reflective"
    }},
    {{
      "section": "chorus",
      "lyrics": "Final chorus...",
      "instruction": "Big finish — everyone singing"
    }}
  ],
  "full_lyrics": "Complete lyrics as one block of text"
}}"""

    response = await chat(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.9,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
        raise ValueError("Failed to parse song")


async def generate_song_audio(lyrics: str, style: str = "afrobeats", language: str = "en") -> str:
    """
    Generate audio for the song using Edge TTS.
    This creates a spoken-word / spoken-rhythm version (free).
    For full music, YuE integration would be used (requires GPU).
    """
    voice_map = {
        "en": "en-KE-AsiliaNeural",
        "sw": "sw-KE-ZuriNeural",
        "fr": "fr-CM-AntoineNeural",
        "ar": "ar-EG-SalmaNeural",
        "am": "am-ET-MekdesNeural",
        "zu": "zu-ZA-ThandoNeural",
    }

    voice = voice_map.get(language, "en-KE-AsiliaNeural")
    song_id = str(uuid.uuid4())[:8]
    filepath = os.path.join(MEDIA_DIR, f"song_{song_id}.mp3")

    # Use a slightly faster rate and cheerful prosody for song-like delivery
    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{language}">
    <voice name="{voice}">
        <prosody rate="+10%" pitch="+5%">
            {lyrics}
        </prosody>
    </voice>
</speak>"""

    communicate = edge_tts.Communicate(lyrics, voice, rate="+10%", pitch="+5Hz")
    await communicate.save(filepath)

    return f"/media/songs/song_{song_id}.mp3"
