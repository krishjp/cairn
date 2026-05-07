from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cairn"
    API_V1_STR: str = "/api/v1"

    POSTGRES_USER: str = "cairn_user"
    POSTGRES_PASSWORD: str = "cairn_password"
    POSTGRES_DB: str = "cairn_db"
    DATABASE_URL: str = "postgresql://cairn_user:cairn_password@db:5432/cairn_db"

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-for-development-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    STRAVA_CLIENT_ID: Optional[str] = None
    STRAVA_CLIENT_SECRET: Optional[str] = None
    STRAVA_WEBHOOK_VERIFY_TOKEN: Optional[str] = None
    STRAVA_REDIRECT_URI: str = "http://localhost:8000/api/v1/strava/callback"

    # Matching Constants
    MATCH_OVERLAP_THRESHOLD: float = 0.8
    MATCH_BUFFER_METERS: float = 20.0
    MATCH_SEARCH_RADIUS_METERS: float = 500.0

    # Ranking Constants (TrueSkill)
    RANKING_BETA: float = 1.0  # Distinguishability (performance noise)
    RANKING_TAU: float = 0.05  # Dynamics (sigma floor/drift)
    RANKING_DRAW_PROB: float = 0.05  # Probability of a tie
    RANKING_INITIAL_SIGMA: float = 1.0
    RANKING_CALIBRATION_THRESHOLD: int = 5

    # Dynamic Bucket Percentiles (Must sum to 1.0)
    RANKING_PERCENTILE_PEAK: float = 0.25  # Top 25%
    RANKING_PERCENTILE_HIKE: float = 0.50  # Next 50%
    NGROK_AUTHTOKEN: Optional[str] = None
    NGROK_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
