from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.db import get_session
from app.core.config import settings
from app.models.models import Activity, CanonicalRoute
from app.services.geometry import trim_linestring_by_meters, simplify_geometry
from geoalchemy2.shape import to_shape, from_shape
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/promote-activity/{activity_id}")
def promote_activity(
    activity_id: uuid.UUID,
    name: str,
    trim_start_m: float = 50.0,
    trim_end_m: float = 50.0,
    session: Session = Depends(get_session),
):
    """
    Promotes a user activity to a new Canonical Route.
    Trims the start and end of the activity to clean up trailhead noise.
    """
    # Fetch activity
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    try:
        # Convert to Shapely and Clean
        # activity.raw_polyline is a WKBElement
        shape = to_shape(activity.raw_polyline)

        # Trim
        cleaned_shape = trim_linestring_by_meters(shape, trim_start_m, trim_end_m)

        # Simplify (Douglas-Peucker)
        final_shape = simplify_geometry(cleaned_shape)

        # Create Canonical Route
        new_route = CanonicalRoute(
            name=name,
            geometry=from_shape(final_shape, srid=4326),
            rating_score=settings.INITIAL_ELO_RATING,
        )

        session.add(new_route)
        session.commit()
        session.refresh(new_route)

        # Link activity to the new route
        activity.canonical_route_id = new_route.id
        activity.match_confidence = 1.0  # 100% match since it DEFINES the route
        session.add(activity)
        session.commit()

        logger.info(
            f"Activity {activity_id} promoted to new route: {name} (ID: {new_route.id})"
        )
        return {"status": "success", "route_id": new_route.id, "name": new_route.name}

    except Exception as e:
        logger.error(f"Error promoting activity: {e}")
        raise HTTPException(status_code=500, detail=f"Promotion failed: {str(e)}")
