import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "BrandLedger API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # Vercel's deployment filesystem is read-only. Use its writable /tmp
    # directory for demo SQLite writes unless a persistent DATABASE_URL is set.
    # For production, configure DATABASE_URL to a managed PostgreSQL database.
    _default_sqlite = "sqlite:////tmp/brandledger.db" if os.getenv("VERCEL") == "1" else "sqlite:///./brandledger.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", _default_sqlite)

    # Hosted-deployment settings (Round 3 / Improvement 3: live Chrome extension)
    # Comma-separated list of allowed browser origins. "*" is fine for the extension
    # because requests from it are made by the background service worker.
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    # Optional shared secret. When set, POST /guard requires header X-BrandLedger-Key.
    GUARD_API_KEY: str = os.getenv("GUARD_API_KEY", "")

    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock_governance_engine")
    ABSTAIN_CONFIDENCE_THRESHOLD: float = 0.75

def _normalize_db_url(url: str) -> str:
    """Managed hosts (Render, Heroku, Neon, Supabase) hand out postgres:// URLs,
    which SQLAlchemy 2 rejects. Rewrite to the psycopg2 driver form."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url

settings = Settings()
settings.DATABASE_URL = _normalize_db_url(settings.DATABASE_URL)
