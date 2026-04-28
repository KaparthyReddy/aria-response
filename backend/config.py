from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-4-20250514"
    ai_timeout: int = 20
    fallback_mode: bool = False
    frontend_url: str = "http://localhost:5173"
    jwt_secret: str = "change_this_secret"
    jwt_expire_hours: int = 12

    class Config:
        env_file = "../.env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
