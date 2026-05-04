from app.services.ranking import calculate_elo_update, record_comparison
from app.models.models import CanonicalRoute, User
from sqlmodel import Session


def test_calculate_elo_update():
    # Same rating, winner should gain, loser should lose same amount
    w_new, l_new = calculate_elo_update(1000, 1000, k_factor=32)
    assert w_new == 1016
    assert l_new == 984


def test_calculate_elo_update_upset():
    # Weak player beats strong player
    w_new, l_new = calculate_elo_update(800, 1200, k_factor=32)
    # Weak player should gain significantly more than 16
    assert w_new > 816
    assert l_new < 1184


def test_record_comparison(session: Session):
    # Setup routes
    r1 = CanonicalRoute(
        name="Trail 1", geometry="LINESTRING(0 0, 1 1)", rating_score=1000.0
    )
    r2 = CanonicalRoute(
        name="Trail 2", geometry="LINESTRING(2 2, 3 3)", rating_score=1000.0
    )
    user = User(display_name="Voter", strava_id=777)
    session.add(r1)
    session.add(r2)
    session.add(user)
    session.commit()

    # Record vote: r1 beats r2
    record_comparison(session, user.id, r1.id, r2.id)

    # Verify
    session.refresh(r1)
    session.refresh(r2)
    assert r1.rating_score > 1000
    assert r2.rating_score < 1000

    # Verify personal ratings
    from app.models.models import UserRouteRating

    r1_personal = session.get(UserRouteRating, (user.id, r1.id))
    r2_personal = session.get(UserRouteRating, (user.id, r2.id))
    assert r1_personal.rating_score > 1000
    assert r2_personal.rating_score < 1000
