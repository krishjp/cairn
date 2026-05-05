import logging
from typing import Tuple
from sqlmodel import Session
from app.models.models import CanonicalRoute, Comparison

from app.core.config import settings

logger = logging.getLogger(__name__)


def calculate_elo_update(
    winner_rating: float,
    loser_rating: float,
    k_factor: int = settings.DEFAULT_ELO_K_FACTOR,
) -> Tuple[float, float]:
    """
    Calculate new Elo ratings for a winner and a loser.
    """
    # Expected scores
    expected_winner = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 4.0))
    expected_loser = 1 - expected_winner

    # New ratings
    new_winner_rating = winner_rating + k_factor * (1 - expected_winner)
    new_loser_rating = loser_rating + k_factor * (0 - expected_loser)

    return new_winner_rating, new_loser_rating


def record_comparison(session: Session, user_id: str, winner_id: int, loser_id: int):
    """
    Records a comparison between two routes and updates both user-specific and global ratings.
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

    # Update Global ratings
    new_global_w, new_global_l = calculate_elo_update(
        winner.rating_score, loser.rating_score
    )
    winner.rating_score = new_global_w
    loser.rating_score = new_global_l

    # Update User-specific ratings
    # Fetch or create user ratings
    user_winner_rating = session.get(UserRouteRating, (user_id, winner_id))
    if not user_winner_rating:
        user_winner_rating = UserRouteRating(
            user_id=user_id,
            canonical_route_id=winner_id,
            rating_score=settings.INITIAL_ELO_RATING,
        )

    user_loser_rating = session.get(UserRouteRating, (user_id, loser_id))
    if not user_loser_rating:
        user_loser_rating = UserRouteRating(
            user_id=user_id,
            canonical_route_id=loser_id,
            rating_score=settings.INITIAL_ELO_RATING,
        )

    new_user_w, new_user_l = calculate_elo_update(
        user_winner_rating.rating_score, user_loser_rating.rating_score
    )
    user_winner_rating.rating_score = new_user_w
    user_loser_rating.rating_score = new_user_l

    session.add(winner)
    session.add(loser)
    session.add(user_winner_rating)
    session.add(user_loser_rating)
    session.commit()

    logger.info(
        f"Comparison recorded for user {user_id}: {winner.name} beat {loser.name}."
    )
    return comparison
