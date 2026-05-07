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
    # create a test user
    user = User(display_name="Test User", strava_id=999, username="matching_user")
    session.add(user)
    session.commit()

    from geoalchemy2.shape import from_shape

    line = LineString([(0, 0), (1, 1), (2, 2)])

    # create a canonical route
    route = CanonicalRoute(
        osm_id=123, name="Test Trail", geometry=from_shape(line, srid=4326)
    )
    session.add(route)
    session.commit()

    # create an activity that matches
    activity = Activity(
        user_id=user.id,
        strava_activity_id=456,
        raw_polyline=from_shape(line, srid=4326),
    )
    session.add(activity)
    session.commit()

    # run matching
    match_activity_to_route(activity.id, session=session)

    # verify match
    session.refresh(activity)
    assert activity.canonical_route_id == route.id
    assert activity.match_confidence > 0.9
