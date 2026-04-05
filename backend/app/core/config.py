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


