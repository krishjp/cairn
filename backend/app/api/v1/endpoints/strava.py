from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.config import settings
from app.services import strava as strava_service
from app.services.strava import get_activity_stream, stream_to_wkt
from app.services.matching import match_activity_to_route
from app.models.models import User, Activity, StravaAccount, Follow, CanonicalRoute, UserRouteRating
import uuid
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/authorize")
def authorize(redirect_uri: str = "cairn-app://auth/strava"):
    """Redirect user to Strava authorize page."""
    scope = "read,activity:read_all"
    url = (
        f"https://www.strava.com/oauth/authorize?client_id={settings.STRAVA_CLIENT_ID}"
        f"&response_type=code&redirect_uri={settings.STRAVA_REDIRECT_URI}"
        f"&approval_prompt=auto&scope={scope}&state={redirect_uri}"
    )
    return {"url": url}


@router.get("/callback")
async def callback(
    code: str,
    state: str = "cairn-app://auth/strava",
    session: Session = Depends(get_session),
):
    """Handle Strava OAuth2 callback."""
    try:
        token_data = strava_service.exchange_code_for_token(code)
        athlete = token_data.get("athlete", {})
        strava_id = athlete.get("id")

        # Find or create strava account
        strava_stmt = select(StravaAccount).where(StravaAccount.strava_id == strava_id)
        strava_acc = session.exec(strava_stmt).first()

        if not strava_acc:
            # Create user first
            user = User(
                display_name=f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip(),
            )
            session.add(user)
            session.flush()

            strava_acc = StravaAccount(strava_id=strava_id, user_id=user.id)
            session.add(strava_acc)
        else:
            user = strava_acc.user

        strava_acc.access_token = token_data.get("access_token")
        strava_acc.refresh_token = token_data.get("refresh_token")
        strava_acc.expires_at = token_data.get("expires_at")

        session.add(strava_acc)
        session.commit()

        # Redirect back to the app/web using the provided state as target
        separator = "&" if "?" in state else "?"
        return RedirectResponse(
            url=f"{state}{separator}status=success&name={user.display_name}&id={user.id}"
        )
    except Exception as e:
        logger.error(f"OAuth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sync")
async def sync_activities(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Manually trigger a sync of recent Strava activities."""
    strava_stmt = select(StravaAccount).where(StravaAccount.user_id == user_id)
    strava_acc = session.exec(strava_stmt).first()

    if not strava_acc or not strava_acc.access_token:
        raise HTTPException(status_code=400, detail="Strava account not linked")

    try:
        logger.info(f"Starting sync for user {user_id}")
        activities = strava_service.get_recent_activities(strava_acc.access_token)
        logger.info(f"Found {len(activities)} recent activities from Strava")
        synced_count = 0

        for act in activities:
            activity_id = act.get("id")
            # Check if already exists
            existing = session.exec(
                select(Activity).where(Activity.strava_activity_id == int(activity_id))
            ).first()

            if existing:
                # Update social stats even if activity exists
                existing.reactions_count = act.get("kudos_count", 0)
                existing.comments_count = act.get("comment_count", 0)
                session.add(existing)

                # If it exists but hasn't matched a trail yet, and it's not ignored, try matching again
                if not existing.canonical_route_id and not existing.is_ignored:
                    if existing.sport_type in ["Hike", "Walk"]:
                        logger.info(f"Re-attempting match for activity {activity_id}")
                        match_activity_to_route(existing.id, session=session)
                continue

            logger.info(f"Processing new activity {activity_id} ({act.get('type')})")

            # Fetch stream and process
            stream_data = get_activity_stream(activity_id, strava_acc.access_token)
            wkt = stream_to_wkt(stream_data)

            if wkt:
                # Parse start date
                start_date = None
                if act.get("start_date"):
                    try:
                        start_date = datetime.fromisoformat(
                            act.get("start_date").replace("Z", "+00:00")
                        )
                    except Exception:
                        pass

                new_activity = Activity(
                    user_id=user_id,
                    strava_activity_id=int(activity_id),
                    raw_polyline=wkt,
                    name=act.get("name"),
                    sport_type=act.get("sport_type") or act.get("type"),
                    distance=act.get("distance"),
                    moving_time=act.get("moving_time"),
                    start_date=start_date,
                    notes=act.get("description"),
                    reactions_count=act.get("kudos_count", 0),
                    comments_count=act.get("comment_count", 0),
                )
                session.add(new_activity)
                session.flush()

                # Only attempt matching for hiking activities
                if new_activity.sport_type in ["Hike", "Walk"]:
                    match_activity_to_route(new_activity.id, session=session)

                synced_count += 1

        session.commit()
        return {"status": "ok", "synced": synced_count}
    except Exception as e:
        logger.exception(f"Sync Error for user {user_id}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities")
async def get_user_activities(
    user_id: uuid.UUID,
    limit: int = 20,
    only_matched: bool = True,
    session: Session = Depends(get_session),
):
    """Fetch a user's activities from the local database."""
    stmt = (
        select(Activity)
        .where(Activity.user_id == user_id)
        .where(Activity.is_ignored.is_(False))
    )

    if only_matched:
        stmt = stmt.where(Activity.canonical_route_id.is_not(None))

    stmt = stmt.order_by(Activity.start_date.desc()).limit(limit)

    activities = session.exec(stmt).all()

    result = []
    for act in activities:
        act_dict = act.dict()
        if "raw_polyline" in act_dict:
            del act_dict["raw_polyline"]

        if act.canonical_route:
            act_dict["trail_name"] = act.canonical_route.name
        result.append(act_dict)

    return result


@router.get("/feed")
async def get_social_feed(
    user_id: uuid.UUID, limit: int = 20, session: Session = Depends(get_session)
):
    """Fetch a social feed for the user, including their own and friends' activities."""
    # Get IDs of users being followed
    friend_ids_stmt = select(Follow.followed_id).where(
        Follow.follower_id == user_id, Follow.status == "accepted"
    )
    friend_ids = session.exec(friend_ids_stmt).all()

    # Include the user's own ID
    relevant_user_ids = [user_id] + list(friend_ids)

    # Fetch matched hiking activities, ordered by when they were LAST RANKED, then by start date.
    stmt = (
        select(Activity)
        .outerjoin(
            UserRouteRating,
            (UserRouteRating.canonical_route_id == Activity.canonical_route_id)
            & (UserRouteRating.user_id == Activity.user_id),
        )
        .where(Activity.user_id.in_(relevant_user_ids))
        .where(Activity.is_ignored.is_(False))
        .where(Activity.canonical_route_id.is_not(None))
        .order_by(
            UserRouteRating.last_ranked_at.desc().nulls_last(), 
            Activity.start_date.desc()
        )
        .limit(limit)
    )
    activities = session.exec(stmt).all()

    result = []
    for act in activities:
        act_dict = act.dict()
        if "raw_polyline" in act_dict:
            del act_dict["raw_polyline"]

        act_dict["user_name"] = act.user.display_name
        if act.canonical_route:
            act_dict["trail_name"] = act.canonical_route.name
            # Ensure rating is on a 0-10 scale
            raw_rating = act.canonical_route.rating_score
            act_dict["global_rating"] = (
                raw_rating / 100.0 if raw_rating > 100 else raw_rating
            )

        result.append(act_dict)

    return result


@router.post("/promote")
def promote_activity_to_route(
    activity_id: uuid.UUID, route_id: int, session: Session = Depends(get_session)
):
    """Manually match an activity to a canonical route."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    route = session.get(CanonicalRoute, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Trail not found")

    activity.canonical_route_id = route_id
    session.add(activity)
    session.commit()
    return {"status": "success"}


@router.post("/ignore")
def ignore_activity(activity_id: uuid.UUID, session: Session = Depends(get_session)):
    """Mark an activity as ignored."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.is_ignored = True
    session.add(activity)
    session.commit()
    return {"status": "success"}


@router.post("/restore")
def restore_activity(activity_id: uuid.UUID, session: Session = Depends(get_session)):
    """Un-mark an activity as ignored."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.is_ignored = False
    session.add(activity)
    session.commit()
    return {"status": "success"}


@router.get("/ignored")
async def get_ignored_activities(
    user_id: uuid.UUID, session: Session = Depends(get_session)
):
    """Fetch all ignored activities for a user."""
    stmt = (
        select(Activity)
        .where(Activity.user_id == user_id)
        .where(Activity.is_ignored.is_(True))
        .order_by(Activity.start_date.desc())
    )
    activities = session.exec(stmt).all()
    result = []
    for act in activities:
        act_dict = act.dict()
        if "raw_polyline" in act_dict:
            del act_dict["raw_polyline"]
        result.append(act_dict)
    return result


@router.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    """Verify Strava webhook subscription."""
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.STRAVA_WEBHOOK_VERIFY_TOKEN
    ):
        return {"hub.challenge": hub_challenge}
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def webhook_listener(request: Request, session: Session = Depends(get_session)):
    """Receive Strava webhook events."""
    data = await request.json()
    logger.info(f"Received webhook: {data}")

    if data.get("object_type") == "activity" and data.get("aspect_type") == "create":
        activity_id = data.get("object_id")
        strava_athlete_id = data.get("owner_id")

        strava_stmt = select(StravaAccount).where(
            StravaAccount.strava_id == strava_athlete_id
        )
        strava_acc = session.exec(strava_stmt).first()

        if strava_acc and strava_acc.access_token:
            user = strava_acc.user
            try:
                act_data = strava_service.get_activity(
                    activity_id, strava_acc.access_token
                )
                stream_data = get_activity_stream(activity_id, strava_acc.access_token)
                wkt = stream_to_wkt(stream_data)

                if wkt:
                    start_date = None
                    if act_data.get("start_date"):
                        try:
                            start_date = datetime.fromisoformat(
                                act_data.get("start_date").replace("Z", "+00:00")
                            )
                        except Exception:
                            pass

                    new_activity = Activity(
                        user_id=user.id,
                        strava_activity_id=int(activity_id),
                        raw_polyline=wkt,
                        name=act_data.get("name"),
                        sport_type=act_data.get("sport_type") or act_data.get("type"),
                        distance=act_data.get("distance"),
                        moving_time=act_data.get("moving_time"),
                        start_date=start_date,
                        notes=act_data.get("description"),
                        reactions_count=act_data.get("kudos_count", 0),
                        comments_count=act_data.get("comment_count", 0),
                    )
                    session.add(new_activity)
                    session.flush()

                    if new_activity.sport_type in ["Hike", "Walk"]:
                        match_activity_to_route(new_activity.id, session=session)

                    session.commit()
            except Exception as e:
                logger.error(f"Error processing webhook activity: {e}")
    return {"status": "ok"}
