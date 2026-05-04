from fastapi import FastAPI
from app.api.v1.endpoints import strava
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(strava.router, prefix=f"{settings.API_V1_STR}/strava", tags=["strava"])
