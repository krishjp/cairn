import logging
from sqlmodel import Session
from app.models.models import CanonicalRoute, Comparison
from app.core.config import settings
from app.services.ranking_service import update_rating

logger = logging.getLogger(__name__)


def record_comparison(session: Session, user_id: str, winner_id: int, loser_id: int):
    """
    Records a comparison and updates both user-specific and global ratings using TrueSkill.
    """
    from app.models.models import UserRouteRating

    # Fetch routes
    winner = session.get(CanonicalRoute, winner_id)
    loser = session.get(CanonicalRoute, loser_id)

    if not winner or not loser:
        logger.error(f"Route not found: {winner_id} or {loser_id}")
        return None

    # Record the comparison
    comparison = Comparison(
        user_id=user_id, winner_route_id=winner_id, loser_route_id=loser_id
    )
    session.add(comparison)

    # 1. Update Global ratings (CanonicalRoute)
    (new_gw_mu, new_gw_sigma), (new_gl_mu, new_gl_sigma) = update_rating(
        winner.rating_mu, winner.rating_sigma, loser.rating_mu, loser.rating_sigma
    )
    winner.rating_mu, winner.rating_sigma = new_gw_mu, new_gw_sigma
    winner.rating_score = new_gw_mu

    loser.rating_mu, loser.rating_sigma = new_gl_mu, new_gl_sigma
    loser.rating_score = new_gl_mu

    # 2. Update User-specific ratings
    user_winner_rating = session.get(UserRouteRating, (user_id, winner_id))
    if not user_winner_rating:
        user_winner_rating = UserRouteRating(
            user_id=user_id,
            canonical_route_id=winner_id,
            rating_mu=5.0,
            rating_sigma=settings.RANKING_INITIAL_SIGMA,
            rating_score=5.0,
        )

    user_loser_rating = session.get(UserRouteRating, (user_id, loser_id))
    if not user_loser_rating:
        user_loser_rating = UserRouteRating(
            user_id=user_id,
            canonical_route_id=loser_id,
            rating_mu=5.0,
            rating_sigma=settings.RANKING_INITIAL_SIGMA,
            rating_score=5.0,
        )

    (new_uw_mu, new_uw_sigma), (new_ul_mu, new_ul_sigma) = update_rating(
        user_winner_rating.rating_mu,
        user_winner_rating.rating_sigma,
        user_loser_rating.rating_mu,
        user_loser_rating.rating_sigma,
    )
    user_winner_rating.rating_mu, user_winner_rating.rating_sigma = (
        new_uw_mu,
        new_uw_sigma,
    )
    user_winner_rating.rating_score = new_uw_mu

    user_loser_rating.rating_mu, user_loser_rating.rating_sigma = (
        new_ul_mu,
        new_ul_sigma,
    )
    user_loser_rating.rating_score = new_ul_mu

    session.add(winner)
    session.add(loser)
    session.add(user_winner_rating)
    session.add(user_loser_rating)
    session.commit()

    logger.info(
        f"Comparison recorded for user {user_id}: {winner.name} beat {loser.name}."
    )
    return comparison
