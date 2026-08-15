from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "ScamEscape Arena"
    DEBUG: bool = False
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    OPENAI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.io/api/v1"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    ENVIRONMENT: str = "production"
    
    # 🗄️ MongoDB Configuration
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "scamescape"

    # 🧠 Redis (shared room/game state across backend instances)
    REDIS_URL: str = "redis://localhost:6379/0"

    # 🔐 Auth
    JWT_SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    # Feature flag: when False (default), auth-protected routes/WS still work
    # anonymously so the existing demo flow keeps working. Flip to True once
    # the frontend has a real login flow wired in.
    REQUIRE_AUTH: bool = False

    class Config:
        # 🔥 FIX: Always look for .env in the backend directory (app's root)
        env_file = str(Path(__file__).parent.parent.parent / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

settings = Settings()

# ─── Configuration Validation (Deferred) ──────────────────────────────────────
# Log configuration status on first access
_config_logged = False

def log_configuration():
    """Log configuration status once"""
    global _config_logged
    if _config_logged:
        return
    _config_logged = True
    
    import logging
    logger = logging.getLogger(__name__)
    
    # Check OpenRouter API Key
    if settings.OPENROUTER_API_KEY:
        logger.info(f"✅ OPENROUTER_API_KEY loaded successfully (length: {len(settings.OPENROUTER_API_KEY)} chars)")
    else:
        logger.warning(
            "⚠️  OPENROUTER_API_KEY not configured!\n"
            "   Get your key from: https://openrouter.ai/keys\n"
            "   Set in .env file or environment variable"
        )
    
    # Check MongoDB Configuration
    logger.info(f"🗄️  MongoDB URL: {settings.MONGODB_URL}")
    logger.info(f"📊 Database Name: {settings.DATABASE_NAME}")
    logger.info(f"🧭 MongoDB Compass: {settings.MONGODB_URL} (https://www.mongodb.com/products/tools/compass)")
    logger.info(f"🌍 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔍 Debug Mode: {settings.DEBUG}")


class ConfigurationError(RuntimeError):
    """Raised when required configuration is missing at startup."""


def validate_configuration() -> None:
    """
    Fail fast if configuration required for the app to function is missing.

    The whole game (call/chat simulation, scoring feedback) depends on an
    LLM provider being reachable. Previously a missing key only produced a
    log warning, so the app would boot fine and then fail deep inside a
    live game round. Better to refuse to start.
    """
    has_llm_key = bool(
        settings.GROQ_API_KEY or settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY
    )
    if not has_llm_key:
        raise ConfigurationError(
            "No LLM API key configured. Set GROQ_API_KEY (recommended), "
            "OPENAI_API_KEY, or OPENROUTER_API_KEY in your .env file. "
            "Get a free Groq key at https://console.groq.com/keys"
        )


