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

    DEBUG: bool = Field(default=False, alias="app.debug")


@cache
def get_settings() -> Settings:
    return Settings()