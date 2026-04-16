"""
Learn4Africa — YouTube Video Searcher

Searches YouTube for educational videos and extracts their transcripts.
This is the raw-content layer of the curriculum builder.

No API key needed — uses youtube-search-python for search and yt-dlp
for richer per-video metadata. Transcripts via youtube-transcript-api.

Install:
    pip install youtube-search-python yt-dlp youtube-transcript-api
"""

import re

# ─────────────────────────────────────────────────────────────
# Lazy imports so the module still loads if deps aren't installed yet
# ─────────────────────────────────────────────────────────────
try:
    from youtubesearchpython import VideosSearch
    _SEARCH_OK = True
except ImportError:
    VideosSearch = None
    _SEARCH_OK = False

try:
    import yt_dlp
    _YTDLP_OK = True
except ImportError:
    yt_dlp = None
    _YTDLP_OK = False

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable,
    )
    _TRANSCRIPT_OK = True
except ImportError:
    YouTubeTranscriptApi = None
    TranscriptsDisabled = NoTranscriptFound = VideoUnavailable = Exception
    _TRANSCRIPT_OK = False


# ─────────────────────────────────────────────────────────────
# Search
# ─────────────────────────────────────────────────────────────

def search_videos(query: str, max_results: int = 10) -> list[dict]:
    """
    Search YouTube for videos matching a query. Returns a list of dicts
    with the same shape the rest of the curriculum builder expects.
    """
    if not _SEARCH_OK:
        print("[video_searcher] youtube-search-python is not installed")
        return []

    try:
        search = VideosSearch(query, limit=max_results)
        raw = search.result().get("result", []) or []
    except Exception as e:
        print(f"[video_searcher] search failed for '{query}': {e}")
        return []

    videos: list[dict] = []
    for v in raw:
        duration_text = v.get("duration") or "0:00"
        parts = duration_text.split(":")
        try:
            if len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            else:
                duration_seconds = 0
        except ValueError:
            duration_seconds = 0

        view_text = (v.get("viewCount") or {}).get("text", "0 views")
        first_token = view_text.split(" ")[0] if view_text else "0"
        view_count = int("".join(filter(str.isdigit, first_token)) or 0)

        description_snippet = v.get("descriptionSnippet") or [{}]
        description = description_snippet[0].get("text", "") if description_snippet else ""

        thumbnails = v.get("thumbnails") or [{}]
        thumbnail_url = thumbnails[0].get("url", "") if thumbnails else ""

        vid = v.get("id", "")
        if not vid:
            continue

        videos.append({
            "video_id": vid,
            "title": v.get("title", ""),
            "description": description,
            "channel_title": (v.get("channel") or {}).get("name", ""),
            "channel_id": (v.get("channel") or {}).get("id", ""),
            "duration_seconds": duration_seconds,
            "view_count": view_count,
            "like_count": 0,
            "thumbnail_url": thumbnail_url,
            "has_captions": True,
            "published_at": v.get("publishedTime", "") or "",
            "url": f"https://www.youtube.com/watch?v={vid}",
        })

    return videos


# ─────────────────────────────────────────────────────────────
# Single-video details (richer metadata via yt-dlp)
# ─────────────────────────────────────────────────────────────

def get_video_details(video_id: str) -> dict:
    """Fetch full metadata for a single video using yt-dlp."""
    if not _YTDLP_OK:
        print("[video_searcher] yt-dlp is not installed")
        return {}

    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {"quiet": True, "skip_download": True, "no_warnings": True}

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}
    except Exception as e:
        print(f"[video_searcher] yt-dlp failed for {video_id}: {e}")
        return {}

    return {
        "video_id": video_id,
        "title": info.get("title", ""),
        "description": info.get("description", ""),
        "channel_title": info.get("uploader", ""),
        "channel_id": info.get("channel_id", ""),
        "duration_seconds": info.get("duration", 0) or 0,
        "view_count": info.get("view_count", 0) or 0,
        "like_count": info.get("like_count", 0) or 0,
        "thumbnail_url": info.get("thumbnail", ""),
        "has_captions": bool(info.get("subtitles") or info.get("automatic_captions")),
        "published_at": info.get("upload_date", "") or "",
        "url": url,
    }


# ─────────────────────────────────────────────────────────────
# Transcript
# ─────────────────────────────────────────────────────────────

def get_transcript(video_id: str) -> str:
    """
    Return a clean, timestamp-stripped transcript for a YouTube video.
    Tries English (manual) first, then English (auto-generated).
    Returns "" if no transcript is available — never raises.
    """
    if not _TRANSCRIPT_OK:
        print("[video_searcher] youtube-transcript-api not installed")
        return ""

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except (TranscriptsDisabled, VideoUnavailable, Exception) as e:
        print(f"[video_searcher] No transcripts for {video_id}: {e}")
        return ""

    transcript = None

    # Prefer manually-created English
    try:
        transcript = transcript_list.find_manually_created_transcript(["en", "en-US", "en-GB"])
    except NoTranscriptFound:
        pass

    # Fall back to auto-generated English
    if transcript is None:
        try:
            transcript = transcript_list.find_generated_transcript(["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            pass

    # Last resort: any available transcript
    if transcript is None:
        try:
            for t in transcript_list:
                transcript = t
                break
        except Exception:
            return ""

    if transcript is None:
        return ""

    try:
        entries = transcript.fetch()
    except Exception as e:
        print(f"[video_searcher] Transcript fetch failed for {video_id}: {e}")
        return ""

    # Each entry is {'text': '...', 'start': float, 'duration': float}
    text_parts = []
    for entry in entries:
        text = entry.get("text", "") if isinstance(entry, dict) else getattr(entry, "text", "")
        if text:
            # Strip bracketed annotations like [Music], [Applause]
            clean = re.sub(r"\[[^\]]*\]", "", text)
            clean = clean.replace("\n", " ").strip()
            if clean:
                text_parts.append(clean)

    return " ".join(text_parts)
