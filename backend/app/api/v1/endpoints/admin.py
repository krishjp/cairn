from fastapi import APIRouter, BackgroundTasks, Depends
from app.services.osm import seed_canonical_routes
from app.api.deps import get_current_admin_user
from app.models.models import User
from app.enrich_routes import enrich

router = APIRouter()


def seed_and_enrich(bbox: str):
    """Sequence seeding followed by automated enrichment."""
    seed_canonical_routes(bbox)
    enrich()


@router.post("/seed-osm")
async def seed_osm(
    background_tasks: BackgroundTasks,
    bbox: str = "37.70,-122.55,37.85,-122.35",
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Trigger OSM seeding and Wikipedia enrichment as background tasks.
    bbox format: "lat_min,lon_min,lat_max,lon_max"
    """
    background_tasks.add_task(seed_and_enrich, bbox)
    return {"message": "OSM seeding and enrichment started in the background."}
