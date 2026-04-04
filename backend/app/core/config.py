from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "FraudGuard Arena"
    DEBUG: bool = False
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    DATABASE_URL: Optional[str] = None
    ENVIRONMENT: str = "production"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields

settings = Settings()
