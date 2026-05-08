import pytest
from unittest.mock import patch, MagicMock
from sqlmodel import Session, select
from app.models.models import User, StravaAccount, Activity
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def mock_strava_user(session: Session):
    user = User(display_name="Strava User", username="strava_user")
    session.add(user)
    session.flush()
    
    strava_acc = StravaAccount(
        strava_id=99999,
        user_id=user.id,
        access_token="fake_token"
    )
    session.add(strava_acc)
    session.commit()
    return user, strava_acc

@patch("app.api.v1.endpoints.strava.strava_service.get_activity")
@patch("app.api.v1.endpoints.strava.get_activity_stream")
@patch("app.api.v1.endpoints.strava.match_activity_to_route")
def test_strava_webhook_create_activity(
    mock_match,
    mock_stream,
    mock_get_act,
    client: TestClient,
    session: Session,
    mock_strava_user
):
    user, strava_acc = mock_strava_user
    
    # Mock Strava API responses
    mock_get_act.return_value = {
        "id": 123456,
        "name": "Evening Hike",
        "type": "Hike",
        "distance": 5000,
        "moving_time": 3600,
        "start_date": "2024-05-07T18:00:00Z",
        "description": "Great view!"
    }
    mock_stream.return_value = {
        "latlng": {"data": [[45.0, -122.0], [45.1, -122.1]]}
    }
    
    # Send Webhook
    webhook_data = {
        "object_type": "activity",
        "aspect_type": "create",
        "object_id": 123456,
        "owner_id": 99999
    }
    
    response = client.post("/api/v1/strava/webhook", json=webhook_data)
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    
    # Verify activity was created in DB
    stmt = select(Activity).where(Activity.strava_activity_id == 123456)
    activity = session.exec(stmt).first()
    
    assert activity is not None
    assert activity.user_id == user.id
    assert activity.name == "Evening Hike"
    assert activity.distance == 5000
    
    # Verify matching was triggered
    mock_match.assert_called_once()
