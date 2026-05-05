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

    # Matching Constants
    MATCH_OVERLAP_THRESHOLD: float = 0.8
    MATCH_BUFFER_METERS: float = 20.0
    MATCH_SEARCH_RADIUS_METERS: float = 500.0

    # Ranking Constants
    # K-factor determines how much the rating changes after each comparison
    DEFAULT_ELO_K_FACTOR: float = 0.4
    INITIAL_ELO_RATING: float = 5.0

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
