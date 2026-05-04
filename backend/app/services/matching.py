import logging
from typing import Optional, Tuple
from shapely.geometry import LineString
from geoalchemy2.shape import to_shape
from sqlmodel import Session, select
from sqlalchemy import func
from app.models.models import Activity, CanonicalRoute
from app.core.db import engine

logger = logging.getLogger(__name__)

# Approx 20 meters in degrees at the equator
DEFAULT_BUFFER_DEGREES = 0.0002


def calculate_overlap(
    activity_shape: LineString,
    route_shape: LineString,
    buffer_deg: float = DEFAULT_BUFFER_DEGREES,
) -> float:
    """
    Calculates the percentage of the activity that overlaps with the route.
    """
    if activity_shape.length == 0:
        return 0.0

    # Buffer the route to account for GPS jitter
    buffered_route = route_shape.buffer(buffer_deg)

    # Find the intersection of the activity and the buffered route
    intersection = activity_shape.intersection(buffered_route)

    # Overlap is the ratio of the length of the intersection to the total length
    overlap_ratio = intersection.length / activity_shape.length
    return min(overlap_ratio, 1.0)


def match_activity_to_route(
    activity_id: str, session: Optional[Session] = None
) -> Optional[Tuple[int, float]]:
    """
    Attempts to match an activity to a canonical route.
    Returns (route_id, confidence) if a match is found, else None.
    """
    if session is None:
        with Session(engine) as new_session:
            return _match_activity_to_route_with_session(activity_id, new_session)
    else:
        return _match_activity_to_route_with_session(activity_id, session)


def _match_activity_to_route_with_session(
    activity_id: str, session: Session
) -> Optional[Tuple[int, float]]:
    activity = session.get(Activity, activity_id)
    if not activity:
        logger.error(f"Activity {activity_id} not found.")
        return None

    # Convert activity geometry to Shapely
    activity_shape = to_shape(activity.raw_polyline)

    # find candidate routes using a spatial filter
    candidates_statement = select(CanonicalRoute).where(
        func.ST_DWithin(CanonicalRoute.geometry, activity.raw_polyline, 0.005)  # ~500m
    )
    candidates = session.exec(candidates_statement).all()

    best_match_id = None
    max_overlap = 0.0

    for route in candidates:
        route_shape = to_shape(route.geometry)
        overlap = calculate_overlap(activity_shape, route_shape)

        if overlap > max_overlap:
            max_overlap = overlap
            best_match_id = route.id

    # Threshold for a valid match
    if best_match_id and max_overlap > 0.8:
        activity.canonical_route_id = best_match_id
        activity.match_confidence = max_overlap
        session.add(activity)
        session.commit()
        logger.info(
            f"Matched activity {activity_id} to route {best_match_id} (confidence: {max_overlap:.2f})"
        )
        return best_match_id, max_overlap

    logger.info(
        f"No match found for activity {activity_id} (max confidence: {max_overlap:.2f})"
    )
    return None
