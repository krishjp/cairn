from app.services.ranking import record_comparison
from app.models.models import CanonicalRoute, User, UserRouteRating
from sqlmodel import Session
from app.core.config import settings


def test_record_comparison_trueskill(session: Session):
    """
    Test that record_comparison correctly updates TrueSkill mu and sigma in the DB.
    """
    # 1. Setup routes with baseline priors
    r1 = CanonicalRoute(
        name="Trail 1",
        geometry="LINESTRING(0 0, 1 1)",
        rating_mu=5.0,
        rating_sigma=settings.RANKING_INITIAL_SIGMA,
        rating_score=5.0,
    )
    r2 = CanonicalRoute(
        name="Trail 2",
        geometry="LINESTRING(2 2, 3 3)",
        rating_mu=5.0,
        rating_sigma=settings.RANKING_INITIAL_SIGMA,
        rating_score=5.0,
    )
    user = User(display_name="Voter")
    session.add(r1)
    session.add(r2)
    session.add(user)
    session.commit()

    # 2. Record vote: r1 beats r2
    record_comparison(session, user.id, r1.id, r2.id)

    # 3. Verify CanonicalRoute updates
    session.refresh(r1)
    session.refresh(r2)

    # Mu should go up for winner, down for loser
    assert r1.rating_mu > 5.0
    assert r2.rating_mu < 5.0
    # Sigma should shrink for both (increased certainty)
    assert r1.rating_sigma < settings.RANKING_INITIAL_SIGMA
    assert r2.rating_sigma < settings.RANKING_INITIAL_SIGMA
    # rating_score should follow mu
    assert r1.rating_score == r1.rating_mu

    # 4. Verify UserRouteRating updates
    r1_personal = session.get(UserRouteRating, (user.id, r1.id))
    r2_personal = session.get(UserRouteRating, (user.id, r2.id))

    assert r1_personal is not None
    assert r1_personal.rating_mu > 5.0
    assert r1_personal.rating_sigma < settings.RANKING_INITIAL_SIGMA

    assert r2_personal is not None
    assert r2_personal.rating_mu < 5.0
    assert r2_personal.rating_sigma < settings.RANKING_INITIAL_SIGMA


def test_record_comparison_multiple_votes(session: Session):
    """
    Test that multiple comparisons continue to refine the scores.
    """
    r1 = CanonicalRoute(
        name="Best Trail",
        geometry="LINESTRING(0 0, 1 1)",
        rating_mu=5.0,
        rating_sigma=1.0,
    )
    r2 = CanonicalRoute(
        name="Mid Trail",
        geometry="LINESTRING(2 2, 3 3)",
        rating_mu=5.0,
        rating_sigma=1.0,
    )
    user = User(display_name="Frequent Voter")
    session.add_all([r1, r2, user])
    session.commit()

    # r1 beats r2 twice
    record_comparison(session, user.id, r1.id, r2.id)
    mu_after_1 = r1.rating_mu

    record_comparison(session, user.id, r1.id, r2.id)
    session.refresh(r1)

    assert r1.rating_mu > mu_after_1
    assert r1.rating_sigma < 1.0
