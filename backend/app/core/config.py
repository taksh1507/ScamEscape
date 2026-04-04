from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "ScamEscape Arena"
    DEBUG: bool = False
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    ENVIRONMENT: str = "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Load from OS environment AND .env file
        extra = "ignore"
    
    def __init__(self, **data):
        # Fallback to OS environment if not in .env
        if not data.get("GROQ_API_KEY"):
            data["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
        super().__init__(**data)

settings = Settings()
import logging
logger = logging.getLogger(__name__)
if settings.GROQ_API_KEY:
    logger.info(f"✅ GROQ_API_KEY loaded successfully (length: {len(settings.GROQ_API_KEY)} chars)")
else:
    logger.warning("❌ GROQ_API_KEY not found in configuration!")
