from shapely.geometry import LineString
from app.services.matching import calculate_overlap, match_activity_to_route
from app.models.models import User, Activity, CanonicalRoute
from sqlmodel import Session


def test_calculate_overlap_perfect_match():
    # Identical lines
    line = LineString([(0, 0), (1, 1), (2, 2)])
    overlap = calculate_overlap(line, line)
    assert overlap == 1.0


def test_calculate_overlap_no_match():
    # Lines far apart
    line1 = LineString([(0, 0), (1, 1)])
    line2 = LineString([(10, 10), (11, 11)])
    overlap = calculate_overlap(line1, line2)
    assert overlap == 0.0


def test_calculate_overlap_partial_match():
    # Line1 is longer than Line2
    line1 = LineString([(0, 0), (10, 0)])  # Length 10
    line2 = LineString([(0, 0), (5, 0)])  # Length 5
    # Since we buffer line2, the intersection will be length 5
    overlap = calculate_overlap(line1, line2)
    assert 0.49 < overlap < 0.51  # ~50%


def test_match_activity_to_route(session: Session):
    # 1. Create a test user
    user = User(display_name="Test User", strava_id=999)
    session.add(user)
    session.commit()

    # 2. Create a canonical route
    route = CanonicalRoute(
        osm_id=123, name="Test Trail", geometry="LINESTRING(0 0, 1 1, 2 2)"
    )
    session.add(route)
    session.commit()

    # 3. Create an activity that matches
    activity = Activity(
        user_id=user.id,
        strava_activity_id=456,
        raw_polyline="LINESTRING(0 0, 1 1, 2 2)",
    )
    session.add(activity)
    session.commit()

    # 4. Run matching
    match_activity_to_route(activity.id, session=session)

    # 5. Verify match
    session.refresh(activity)
    assert activity.canonical_route_id == route.id
    assert activity.match_confidence > 0.9
