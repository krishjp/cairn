from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List
from app.core.db import get_session
from app.models.models import CanonicalRoute, Activity
from app.services.ranking import record_comparison
import uuid

router = APIRouter()


@router.get("/leaderboard", response_model=List[CanonicalRoute])
def get_leaderboard(limit: int = 20, session: Session = Depends(get_session)):
    """Get the global leaderboard of trails."""
    statement = (
        select(CanonicalRoute).order_by(CanonicalRoute.rating_score.desc()).limit(limit)
    )
    return session.exec(statement).all()


@router.get("/personal-leaderboard")
def get_personal_leaderboard(
    user_id: uuid.UUID, limit: int = 20, session: Session = Depends(get_session)
):
    """Get the user's personal ranking of trails."""
    from app.models.models import UserRouteRating

    statement = (
        select(CanonicalRoute, UserRouteRating.rating_score)
        .join(UserRouteRating)
        .where(UserRouteRating.user_id == user_id)
        .order_by(UserRouteRating.rating_score.desc())
        .limit(limit)
    )
    results = session.exec(statement).all()

    # Flatten the result to return route data with the personal score
    return [
        {**route.model_dump(), "personal_score": score} for route, score in results
    ]


@router.get("/next-pair")
def get_next_pair(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """
    Suggests the next two trails for a user to compare.
    Strategy: Pick two distinct trails the user has completed.
    """
    # 1. Find unique trails the user has activities for
    subquery = (
        select(Activity.canonical_route_id)
        .where(Activity.user_id == user_id, Activity.canonical_route_id.is_not(None))
        .distinct()
    )

    routes = session.exec(
        select(CanonicalRoute).where(CanonicalRoute.id.in_(subquery))
    ).all()

    if len(routes) < 2:
        # Fallback: Pick two random popular trails if user hasn't done enough
        routes = session.exec(
            select(CanonicalRoute).order_by(func.random()).limit(2)
        ).all()

    if len(routes) < 2:
        raise HTTPException(
            status_code=404, detail="Not enough trails found to compare."
        )

    # Pick the first two (or random if we want)
    import random

    selected = random.sample(routes, 2)

    return {"route_a": selected[0], "route_b": selected[1]}


@router.post("/vote")
def post_vote(
    user_id: uuid.UUID,
    winner_id: int,
    loser_id: int,
    session: Session = Depends(get_session),
):
    """Record a pairwise comparison vote."""
    comparison = record_comparison(session, user_id, winner_id, loser_id)
    if not comparison:
        raise HTTPException(status_code=400, detail="Invalid route IDs.")

    return {"status": "success", "comparison_id": comparison.id}
