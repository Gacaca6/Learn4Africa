"""
Learn4Africa — Configuration

Loads from environment variables (see backend/.env) with sensible
defaults for local development. Values are validated at import time
via pydantic-settings.

Design notes:
- Auth + user state lives in MongoDB (see `models/mongo.py`). A
  local JSON fallback activates automatically when Mongo is offline.
- Legacy course content uses SQLAlchemy — `database_url` is optional;
  the engine is lazy-loaded in `models/database.py`.
- No paid APIs are required. Ollama + edge-tts + HuggingFace free
  tier power everything AI-related.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # tolerate stray vars in .env without raising
    )

    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = "Learn4Africa"
    debug: bool = True

    # ── Legacy Postgres (optional — only the old courses flow uses it) ────────
    # Leave blank to run without Postgres; the auth/tracks path does not
    # need it. When set, `models/database.py::get_engine()` will use it.
    database_url: str = ""
    redis_url: str = ""  # currently unused; reserved for rate-limit backing

    # ── AI Provider: "ollama" (free) | "openai" | "anthropic" ────────────────
    ai_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "minimax-m2:cloud"
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # ── Text-to-Speech: "edge" (free) | "elevenlabs" ─────────────────────────
    tts_provider: str = "edge"
    elevenlabs_api_key: str = ""

    # ── Image Generation: "huggingface" (free tier) | "local" (SD) ───────────
    image_provider: str = "huggingface"
    sd_api_url: str = "http://localhost:7860"
    hf_api_token: str = ""

    # ── Music Generation ─────────────────────────────────────────────────────
    music_provider: str = "local"
    music_model_path: str = "./models/yue"

    # ── Auth / Security ──────────────────────────────────────────────────────
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 168            # 7 days for access tokens
    refresh_expire_days: int = 30          # 30 days for refresh tokens

    # Comma-separated list of allowed browser origins. Wildcard is
    # explicitly rejected at runtime (main.py) to keep CORS credentials
    # behaviour compliant with the WHATWG Fetch spec.
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # ── Google OAuth (ID-token verification on /auth/google) ─────────────────
    google_client_id: str = ""
    google_client_secret: str = ""

    # ── MongoDB (users, progress, portfolio, Mwalimu memory) ─────────────────
    # Leave blank to use the local JSON fallback at backend/data/local_users.json.
    mongodb_uri: str = ""
    mongodb_db_name: str = "learn4africa"

    # ── Supported languages (ISO 639-1) ──────────────────────────────────────
    supported_languages: str = "en,sw,ha,yo,am,fr,ar,zu,ig,rw"


settings = Settings()
