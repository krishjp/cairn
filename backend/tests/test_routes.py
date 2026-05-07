from app.models.models import Activity, User, CanonicalRoute
from sqlmodel import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import LineString


def test_promote_activity(session: Session, client):
    # Setup User and Activity
    user = User(display_name="Promoter", username="promoter")
    session.add(user)
    session.flush()

    # Create a long activity (0 to 1 degree is ~111km)
    # So trimming 50m should be a tiny fraction
    line = LineString([(0, 0), (0.1, 0.1), (0.2, 0.2)])
    activity = Activity(
        user_id=user.id,
        strava_activity_id=123456,
        raw_polyline=from_shape(line, srid=4326),
    )
    session.add(activity)
    session.flush()

    # Call Promotion API
    # Note: We use the client fixture from conftest
    response = client.post(
        f"/api/v1/routes/promote-activity/{activity.id}?name=New%20Summit%20Trail",
        params={"trim_start_m": 50, "trim_end_m": 50},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["name"] == "New Summit Trail"

    # Verify Route was created
    route_id = data["route_id"]
    route = session.get(CanonicalRoute, route_id)
    assert route is not None
    assert route.name == "New Summit Trail"

    # Verify activity was linked
    session.refresh(activity)
    assert activity.canonical_route_id == route_id
    assert activity.match_confidence == 1.0
