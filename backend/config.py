"""Lexora Backend — Configuration"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Find .env file — check backend/ dir first, then project root
_this_dir = Path(__file__).resolve().parent
_env_file = _this_dir / ".env"
if not _env_file.exists():
    _env_file = _this_dir.parent / ".env"


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://hlmfjcjqitjmvrkwtipa.supabase.co"
    supabase_service_key: str = ""
    supabase_anon_key: str = ""

    # App
    app_name: str = "Lexora Claims Engine"
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # n8n
    n8n_webhook_url: str = "http://localhost:5678"

    # LLMs
    groq_api_key: str = ""

    class Config:
        env_file = str(_env_file)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
