from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, text
from typing import Optional
from app.core.db import get_session
from app.models.models import (
    CanonicalRoute,
    Activity,
    UserRouteRating,
    Follow,
    Comparison,
)
import uuid
import random
from app.services.ranking_service import (
    update_rating,
    calculate_match_quality,
    assign_bucket_label,
)

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
    # 1. Get all unmatched activities for this user (The Staging Area)
    unmatched_stmt = (
        select(Activity)
        .where(
            Activity.user_id == user_id,
            Activity.canonical_route_id.is_(None),
            Activity.is_ignored.is_(False),
        )
        .order_by(Activity.start_date.desc())
    )
    unmatched_activities = session.exec(unmatched_stmt).all()

    # 2. Get matched trail IDs
    matched_routes_stmt = (
        select(Activity.canonical_route_id)
        .where(Activity.user_id == user_id, Activity.canonical_route_id.is_not(None))
        .distinct()
    )
    matched_route_ids = session.exec(matched_routes_stmt).all()

    # 3. Handle case where no matched routes exist (but may have unmatched ones)
    if not matched_route_ids:
        return {
            "routes": [],
            "unmatched_activities": [
                a.model_dump(exclude={"raw_polyline"}) for a in unmatched_activities
            ],
            "show_scores": False,
        }

    # 4. Check for calibration status
    ranked_count_stmt = select(func.count(UserRouteRating.canonical_route_id)).where(
        UserRouteRating.user_id == user_id
    )
    ranked_count = session.exec(ranked_count_stmt).one()
    show_scores = ranked_count >= 5

    # 5. Fetch ALL ranked trails for this user to calculate accurate percentiles
    statement = (
        select(CanonicalRoute, UserRouteRating.rating_score)
        .outerjoin(
            UserRouteRating,
            (UserRouteRating.canonical_route_id == CanonicalRoute.id)
            & (UserRouteRating.user_id == user_id),
        )
        .where(CanonicalRoute.id.in_(matched_route_ids))
        .order_by(func.coalesce(UserRouteRating.rating_score, 0).desc())
    )
    all_results = session.exec(statement).all()

    # Filter for items that actually have a score
    ranked_results = [r for r in all_results if r[1] is not None]
    unranked_results = [r for r in all_results if r[1] is None]

    total_ranked = len(ranked_results)

    processed_routes = []

    # Process Ranked Trails
    for i, (route, score) in enumerate(ranked_results):
        bucket = assign_bucket_label(i, total_ranked)

        # Find the most recent activity for this route to get metrics
        activity_stmt = (
            select(Activity)
            .where(Activity.user_id == user_id, Activity.canonical_route_id == route.id)
            .order_by(Activity.start_date.desc())
            .limit(1)
        )
        latest_activity = session.exec(activity_stmt).first()

        processed_routes.append(
            {
                **route.model_dump(exclude={"geometry"}),
                "personal_score": round(score, 2),
                "is_ranked": True,
                "bucket": bucket,
                "distance_meters": latest_activity.distance if latest_activity else 0,
                "moving_time": latest_activity.moving_time if latest_activity else 0,
                "start_date": latest_activity.start_date if latest_activity else None,
            }
        )

    # Process Unranked Trails
    for route, _ in unranked_results:
        activity_stmt = (
            select(Activity)
            .where(Activity.user_id == user_id, Activity.canonical_route_id == route.id)
            .order_by(Activity.start_date.desc())
            .limit(1)
        )
        latest_activity = session.exec(activity_stmt).first()

        processed_routes.append(
            {
                **route.model_dump(exclude={"geometry"}),
                "personal_score": 0,
                "is_ranked": False,
                "bucket": None,
                "distance_meters": latest_activity.distance if latest_activity else 0,
                "moving_time": latest_activity.moving_time if latest_activity else 0,
                "start_date": latest_activity.start_date if latest_activity else None,
            }
        )

    return {
        "routes": processed_routes[:limit],
        "unmatched_activities": [
            a.model_dump(exclude={"raw_polyline"}) for a in unmatched_activities
        ],
        "show_scores": show_scores,
    }


@router.get("/next-pair")
def get_next_pair(
    user_id: uuid.UUID,
    fixed_route_id: Optional[int] = Query(None),
    session: Session = Depends(get_session),
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
            .outerjoin(
                UserRouteRating,
                (UserRouteRating.canonical_route_id == Activity.canonical_route_id)
                & (UserRouteRating.user_id == user_id),
            )
            .where(
                Activity.user_id == user_id,
                Activity.canonical_route_id.is_not(None),
                UserRouteRating.rating_score.is_(None),
            )
            .distinct()
        )
        unranked_ids = session.exec(unranked_stmt).all()
        if not unranked_ids:
            raise HTTPException(status_code=404, detail="All hikes are already ranked.")
        fixed_route_id = random.choice(unranked_ids)

    route_a = session.get(CanonicalRoute, fixed_route_id)
    if not route_a:
        raise HTTPException(status_code=404, detail="Pinned route not found.")

    # 2. Get already ranked routes for Hike B (including their Mu/Sigma)
    ranked_stmt = (
        select(CanonicalRoute, UserRouteRating)
        .join(UserRouteRating)
        .where(UserRouteRating.user_id == user_id, CanonicalRoute.id != fixed_route_id)
    )
    ranked_results = session.exec(ranked_stmt).all()

    if not ranked_results:
        # SPECIAL CASE: This is the user's first hike being ranked
        return {
            "status": "FIRST_HIKE",
            "route_a": route_a.model_dump(exclude={"geometry"}),
        }

    # 3. Get rating for Hike A to use as base for match quality
    rating_a = session.get(UserRouteRating, (user_id, fixed_route_id))
    if not rating_a:
        # If not initialized yet, we can't do match quality, just return first available
        # But in the new flow, it should be initialized.
        rating_a_mu, rating_a_sigma = 5.0, 1.5
    else:
        rating_a_mu, rating_a_sigma = rating_a.rating_mu, rating_a.rating_sigma

    # 4. Filter for uncompared pairs and calculate quality
    existing_comps = session.exec(
        select(Comparison).where(Comparison.user_id == user_id)
    ).all()
    seen_pairs = set()
    for comp in existing_comps:
        seen_pairs.add(tuple(sorted((comp.winner_route_id, comp.loser_route_id))))

    candidates = []
    for b_route, b_rating in ranked_results:
        pair = tuple(sorted((route_a.id, b_route.id)))
        if pair not in seen_pairs:
            quality = calculate_match_quality(
                rating_a_mu, rating_a_sigma, b_rating.rating_mu, b_rating.rating_sigma
            )
            candidates.append((quality, b_route))

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail="Pinned hike has been compared against all ranked trails.",
        )

    # 5. Sort by match quality (descending) and pick the best one
    candidates.sort(key=lambda x: x[0], reverse=True)
    best_match_quality, best_b = candidates[0]

    return {
        "status": "COMPARE",
        "route_a": route_a.model_dump(exclude={"geometry"}),
        "route_b": best_b.model_dump(exclude={"geometry"}),
        "match_quality": round(best_match_quality, 3),
    }

    raise HTTPException(
        status_code=404,
        detail="Pinned hike has been compared against all ranked trails.",
    )


@router.post("/initialize-with-bucket")
def initialize_with_bucket(
    user_id: uuid.UUID,
    route_id: int,
    bucket: int,  # 1, 2, or 3
    session: Session = Depends(get_session),
):
    """Sets the initial score for a hike based on the selected bucket."""
    # Check if already ranked
    existing = session.get(UserRouteRating, (user_id, route_id))
    if existing:
        return {"status": "already_ranked"}

    # Map buckets to priors
    # 1: A Hill (0-3.9)   -> mu=2.0, sigma=1.0
    # 2: Another Hike (4-6.9) -> mu=5.5, sigma=1.0
    # 3: Peak (7-10)      -> mu=8.5, sigma=1.0
    priors = {
        1: {"mu": 2.0, "sigma": 1.0, "score": 2.0},
        2: {"mu": 5.5, "sigma": 1.0, "score": 5.5},
        3: {"mu": 8.5, "sigma": 1.0, "score": 8.5},
    }

    prior = priors.get(bucket, {"mu": 5.0, "sigma": 1.5, "score": 5.0})

    # Create baseline rating
    rating = UserRouteRating(
        user_id=user_id,
        canonical_route_id=route_id,
        rating_score=prior["score"],
        rating_mu=prior["mu"],
        rating_sigma=prior["sigma"],
    )
    session.add(rating)
    session.commit()
    return {"status": "success", "score": prior["score"]}


@router.post("/vote")
def post_vote(
    user_id: uuid.UUID,
    winner_id: int,
    loser_id: int,
    session: Session = Depends(get_session),
):
    """
    Records a comparison and updates scores using TrueSkill Bayesian logic.
    """
    # 1. Record the comparison for history
    comparison = Comparison(
        user_id=user_id, winner_route_id=winner_id, loser_route_id=loser_id
    )
    session.add(comparison)

    # 2. Fetch the ratings for both routes
    winner_rating = session.get(UserRouteRating, (user_id, winner_id))
    loser_rating = session.get(UserRouteRating, (user_id, loser_id))

    if not winner_rating or not loser_rating:
        raise HTTPException(
            status_code=400,
            detail="One of the routes is not yet initialized for this user.",
        )

    # 3. Apply TrueSkill Update
    (new_w_mu, new_w_sigma), (new_l_mu, new_l_sigma) = update_rating(
        winner_rating.rating_mu,
        winner_rating.rating_sigma,
        loser_rating.rating_mu,
        loser_rating.rating_sigma,
    )

    # 4. Update the records
    winner_rating.rating_mu = new_w_mu
    winner_rating.rating_sigma = new_w_sigma
    winner_rating.rating_score = new_w_mu  # Display score is the Mean

    loser_rating.rating_mu = new_l_mu
    loser_rating.rating_sigma = new_l_sigma
    loser_rating.rating_score = new_l_mu  # Display score is the Mean

    session.add(winner_rating)
    session.add(loser_rating)
    session.commit()

    return {
        "status": "success",
        "winner_score": round(winner_rating.rating_score, 2),
        "loser_score": round(loser_rating.rating_score, 2),
        "winner_sigma": round(winner_rating.rating_sigma, 3),
    }


@router.get("/friends-leaderboard")
def get_friends_leaderboard(
    user_id: uuid.UUID, session: Session = Depends(get_session)
):
    """
    Get a leaderboard showing trails ranked by your friends.
    """
    # 1. Get friends
    friends_stmt = select(Follow.followed_id).where(
        Follow.follower_id == user_id, Follow.status == "accepted"
    )
    friend_ids = session.exec(friends_stmt).all()

    if not friend_ids:
        return []

    # 2. Get average scores from friends
    stmt = (
        select(
            CanonicalRoute,
            func.avg(UserRouteRating.rating_score).label("avg_score"),
            func.count(UserRouteRating.user_id).label("friend_count"),
        )
        .join(UserRouteRating, UserRouteRating.canonical_route_id == CanonicalRoute.id)
        .where(UserRouteRating.user_id.in_(friend_ids))
        .group_by(CanonicalRoute.id)
        .order_by(text("avg_score DESC"))
    )
    results = session.exec(stmt).all()

    return [
        {
            **route.model_dump(exclude={"geometry"}),
            "friends_avg_score": round(avg_score, 2),
            "friends_count": friend_count,
        }
        for route, avg_score, friend_count in results
    ]
