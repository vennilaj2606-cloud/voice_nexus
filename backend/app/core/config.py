import os
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoiceNexus AI"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "supersecret-voice-nexus-jwt-token-key-change-in-production-32bytes!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.voicenexus.ai"
    ]

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "voicenexus"
    POSTGRES_PASSWORD: str = "voicenexus_secure_pass"
    POSTGRES_DB: str = "voicenexus_db"
    DATABASE_URL: str = "sqlite+aiosqlite:///./voicenexus.db"
    SYNC_DATABASE_URL: str = "sqlite:///./voicenexus.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # External APIs
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_MODEL: str = "nova-2"

    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    TELNYX_API_KEY: str = ""
    TELNYX_PUBLIC_KEY: str = ""

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""

    @field_validator("DATABASE_URL", mode="before")
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            # Render and Heroku use postgres:// or postgresql:// which need postgresql+asyncpg://
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "?sslmode=" in v:
                v = v.split("?sslmode=")[0]
            elif "&sslmode=" in v:
                v = v.split("&sslmode=")[0]
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_allowed_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        case_sensitive = True
        env_file = ("../.env", ".env")
        extra = "allow"


settings = Settings()
