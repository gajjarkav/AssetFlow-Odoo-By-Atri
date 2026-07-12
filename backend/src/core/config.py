from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from typing import Optional

from functools import cache

class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DEBUG: bool = Field(default=False)
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/assetflow",
        description="Async PostgreSQL connection string",
    )
    
    # JWT Auth
    SECRET_KEY: str = Field(default="super-secret-key-for-local-testing-only-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    # SMTP Settings for OTP
    SMTP_ENABLED: bool = Field(default=False)
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: Optional[str] = Field(default=None)
    SMTP_PASSWORD: Optional[str] = Field(default=None)

    # App branding & CORS
    APP_NAME: str = Field(default="AssetFlow")
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://localhost:3000")


@cache
def get_settings() -> Settings:
    return Settings()