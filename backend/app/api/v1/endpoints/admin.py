from fastapi import APIRouter, BackgroundTasks
from app.services.osm import seed_canonical_routes

router = APIRouter()


@router.post("/seed-osm")
async def seed_osm(
    background_tasks: BackgroundTasks, bbox: str = "37.70,-122.55,37.85,-122.35"
):
    """
    Trigger OSM seeding as a background task.
    bbox format: "lat_min,lon_min,lat_max,lon_max"
    """
    background_tasks.add_task(seed_canonical_routes, bbox)
    return {"message": "OSM seeding started in the background."}
