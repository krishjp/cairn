from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.config import settings
from app.services import strava as strava_service
from app.services.strava import get_activity_stream, stream_to_wkt
from app.services.matching import match_activity_to_route
from app.models.models import User, Activity, StravaAccount
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/authorize")
def authorize():
    """Redirect user to Strava authorize page."""
    scope = "read,activity:read_all"
    url = (
        f"https://www.strava.com/oauth/authorize?client_id={settings.STRAVA_CLIENT_ID}"
        f"&response_type=code&redirect_uri={settings.STRAVA_REDIRECT_URI}"
        f"&approval_prompt=auto&scope={scope}"
    )
    return {"url": url}


@router.get("/callback")
async def callback(code: str, session: Session = Depends(get_session)):
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

        return {
            "status": "success",
            "message": f"Authorized athlete: {user.display_name}",
        }
    except Exception as e:
        logger.error(f"OAuth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


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

        # We should use a background task here, but for now we'll call a service
        # get user via strava account
        strava_stmt = select(StravaAccount).where(
            StravaAccount.strava_id == strava_athlete_id
        )
        strava_acc = session.exec(strava_stmt).first()

        if strava_acc and strava_acc.access_token:
            user = strava_acc.user
            try:
                # fetch activity stream
                stream_data = get_activity_stream(activity_id, strava_acc.access_token)
                wkt = stream_to_wkt(stream_data)

                if wkt:
                    # save activity
                    new_activity = Activity(
                        user_id=user.id,
                        strava_activity_id=activity_id,
                        raw_polyline=wkt,
                    )
                    session.add(new_activity)
                    session.commit()

                    # try matching
                    match_activity_to_route(new_activity.id, session=session)
            except Exception as e:
                logger.error(f"Error processing webhook activity: {e}")
    return {"status": "ok"}
