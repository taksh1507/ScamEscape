from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "FraudGuard Arena"
    DEBUG: bool = False
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    OPENAI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
