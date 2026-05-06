from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import List, Set, Tuple, Optional
from app.core.db import get_session
from app.models.models import CanonicalRoute, Activity, UserRouteRating, Follow, Comparison
from app.services.ranking import record_comparison
from app.core.config import settings
import uuid
import random

router = APIRouter()


@router.get("/leaderboard")
def get_leaderboard(limit: int = 20, session: Session = Depends(get_session)):
    """Get the global leaderboard of trails."""
    statement = (
        select(CanonicalRoute).order_by(CanonicalRoute.rating_score.desc()).limit(limit)
    )
    results = session.exec(statement).all()
    return [r.model_dump(exclude={"geometry"}) for r in results]


@router.get("/personal-leaderboard")
def get_personal_leaderboard(
    user_id: uuid.UUID, limit: int = 20, session: Session = Depends(get_session)
):
    """
    Get the user's personal ranking of trails.
    Scores are normalized 1-10 but only 'shown' if 5+ hikes are ranked.
    """
    matched_routes_stmt = (
        select(Activity.canonical_route_id)
        .where(Activity.user_id == user_id, Activity.canonical_route_id != None)
        .distinct()
    )
    matched_route_ids = session.exec(matched_routes_stmt).all()

    if not matched_route_ids:
        return {"routes": [], "show_scores": False}

    ranked_count_stmt = (
        select(func.count(UserRouteRating.canonical_route_id))
        .where(UserRouteRating.user_id == user_id)
    )
    ranked_count = session.exec(ranked_count_stmt).one()
    show_scores = ranked_count >= 5

    statement = (
        select(CanonicalRoute, UserRouteRating.rating_score)
        .outerjoin(UserRouteRating, 
            (UserRouteRating.canonical_route_id == CanonicalRoute.id) & 
            (UserRouteRating.user_id == user_id)
        )
        .where(CanonicalRoute.id.in_(matched_route_ids))
        .order_by(func.coalesce(UserRouteRating.rating_score, 0).desc())
        .limit(limit)
    )
    results = session.exec(statement).all()

    scores = [score for _, score in results if score is not None]
    min_score = min(scores) if scores else 0
    max_score = max(scores) if scores else 0
    score_range = max_score - min_score

    normalized_routes = []
    for route, score in results:
        is_ranked = score is not None
        display_score = 0
        if is_ranked:
            if score_range > 0:
                display_score = 1.0 + 9.0 * (score - min_score) / score_range
            else:
                display_score = 10.0

        normalized_routes.append({
            **route.model_dump(exclude={"geometry"}), 
            "personal_score": round(display_score, 2),
            "is_ranked": is_ranked
        })

    return {
        "routes": normalized_routes,
        "show_scores": show_scores
    }


@router.get("/next-pair")
def get_next_pair(
    user_id: uuid.UUID, 
    fixed_route_id: Optional[int] = Query(None),
    session: Session = Depends(get_session)
):
    """
    Suggests the next two trails for a user to compare.
    - Always compares pinned hike (A) against ALREADY RANKED hikes (B).
    - Returns status 'FIRST' if no ranked hikes exist yet.
    """
    # 1. Get the pinned route
    if not fixed_route_id:
        # If no fixed ID, pick a random unranked hike as Hike A
        unranked_stmt = (
            select(Activity.canonical_route_id)
            .outerjoin(UserRouteRating, 
                (UserRouteRating.canonical_route_id == Activity.canonical_route_id) & 
                (UserRouteRating.user_id == user_id)
            )
            .where(Activity.user_id == user_id, Activity.canonical_route_id != None, UserRouteRating.rating_score == None)
            .distinct()
        )
        unranked_ids = session.exec(unranked_stmt).all()
        if not unranked_ids:
            raise HTTPException(status_code=404, detail="All hikes are already ranked.")
        fixed_route_id = random.choice(unranked_ids)

    route_a = session.get(CanonicalRoute, fixed_route_id)
    if not route_a:
         raise HTTPException(status_code=404, detail="Pinned route not found.")

    # 2. Get already ranked routes for Hike B
    ranked_stmt = (
        select(CanonicalRoute)
        .join(UserRouteRating)
        .where(UserRouteRating.user_id == user_id, CanonicalRoute.id != fixed_route_id)
    )
    ranked_routes = session.exec(ranked_stmt).all()

    if not ranked_routes:
        # SPECIAL CASE: This is the user's first hike being ranked
        return {"status": "FIRST_HIKE", "route_a": route_a.model_dump(exclude={"geometry"})}

    # 3. Filter for uncompared pairs
    existing_comps = session.exec(select(Comparison).where(Comparison.user_id == user_id)).all()
    seen_pairs = set()
    for comp in existing_comps:
        seen_pairs.add(tuple(sorted((comp.winner_route_id, comp.loser_route_id))))

    # 4. Find an uncompared ranked hike for B
    random.shuffle(ranked_routes)
    for b in ranked_routes:
        pair = tuple(sorted((route_a.id, b.id)))
        if pair not in seen_pairs:
            # Found a match!
            return {
                "status": "COMPARE",
                "route_a": route_a.model_dump(exclude={"geometry"}), 
                "route_b": b.model_dump(exclude={"geometry"})
            }

    raise HTTPException(status_code=404, detail="Pinned hike has been compared against all ranked trails.")


@router.post("/initialize-first")
def initialize_first_hike(user_id: uuid.UUID, route_id: int, session: Session = Depends(get_session)):
    """Sets the very first hike as ranked (10/10 baseline) without comparison."""
    # Check if already ranked
    existing = session.get(UserRouteRating, (user_id, route_id))
    if existing:
        return {"status": "already_ranked"}
    
    # Create baseline rating
    rating = UserRouteRating(
        user_id=user_id,
        canonical_route_id=route_id,
        rating_score=settings.INITIAL_ELO_RATING
    )
    session.add(rating)
    session.commit()
    return {"status": "success"}


@router.post("/vote")
def post_vote(user_id: uuid.UUID, winner_id: int, loser_id: int, session: Session = Depends(get_session)):
    comparison = record_comparison(session, user_id, winner_id, loser_id)
    if not comparison:
        raise HTTPException(status_code=400, detail="Invalid IDs.")
    return {"status": "success", "comparison_id": comparison.id}
