from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cairn"
    API_V1_STR: str = "/api/v1"

    POSTGRES_USER: str = "cairn_user"
    POSTGRES_PASSWORD: str = "cairn_password"
    POSTGRES_DB: str = "cairn_db"
    DATABASE_URL: str = "postgresql://cairn_user:cairn_password@db:5432/cairn_db"

    STRAVA_CLIENT_ID: Optional[str] = None
    STRAVA_CLIENT_SECRET: Optional[str] = None
    STRAVA_WEBHOOK_VERIFY_TOKEN: Optional[str] = None
    STRAVA_REDIRECT_URI: str = "http://localhost:8000/api/v1/strava/callback"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
