import logging
from typing import Optional, Tuple
from geoalchemy2.shape import to_shape
from geoalchemy2.elements import WKBElement, WKTElement
from shapely import wkt
from shapely.geometry import LineString
from sqlmodel import Session, select
from sqlalchemy import func
from app.models.models import Activity, CanonicalRoute
from app.core.db import engine

from app.core.config import settings
from app.services.geometry import project_to_metric, transform

logger = logging.getLogger(__name__)


def _to_shapely(element) -> LineString:
    """Safely convert a GeoAlchemy2 element or WKT string to a Shapely shape."""
    if isinstance(element, (WKBElement, WKTElement)):
        return to_shape(element)
    if isinstance(element, str):
        try:
            return wkt.loads(element)
        except Exception as e:
            logger.error(f"Failed to load WKT string: {e}")
            raise
    return element


def calculate_overlap(
    activity_shape: LineString,
    route_shape: LineString,
    buffer_m: float = settings.MATCH_BUFFER_METERS,
) -> float:
    """
    Calculates the percentage of the activity that overlaps with the route.
    Uses metric projection for accurate buffer calculation.
    """
    # 1. Project both to metric CRS
    metric_activity = transform(project_to_metric, activity_shape)
    metric_route = transform(project_to_metric, route_shape)

    if metric_activity.length == 0:
        return 0.0

    # 2. Buffer the route to account for GPS jitter
    buffered_route = metric_route.buffer(buffer_m)

    # 3. Find the intersection
    intersection = metric_activity.intersection(buffered_route)

    # 4. Overlap is the ratio of metric lengths
    return min(intersection.length / metric_activity.length, 1.0)


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
    activity_shape = _to_shapely(activity.raw_polyline)

    # Find candidate routes using a spatial filter (casting to geography for meters)
    # We use ST_GeomFromText because raw_polyline might be a string during the first sync
    candidates_statement = select(CanonicalRoute).where(
        func.ST_DWithin(
            func.ST_Transform(CanonicalRoute.geometry, 3857),
            func.ST_Transform(func.ST_GeomFromText(activity.raw_polyline, 4326), 3857),
            settings.MATCH_SEARCH_RADIUS_METERS,
        )
    )
    candidates = session.exec(candidates_statement).all()

    best_match_id = None
    max_overlap = 0.0

    for route in candidates:
        route_shape = _to_shapely(route.geometry)
        overlap = calculate_overlap(activity_shape, route_shape)

        if overlap > max_overlap:
            max_overlap = overlap
            best_match_id = route.id

    # Threshold for a valid match
    if best_match_id and max_overlap > settings.MATCH_OVERLAP_THRESHOLD:
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
