from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_session
from app.core.config import settings
from app.services import strava as strava_service
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
        # TODO: Save user and tokens to database
        return {"status": "success", "data": token_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token")
):
    """Verify Strava webhook subscription."""
    if hub_mode == "subscribe" and hub_verify_token == settings.STRAVA_WEBHOOK_VERIFY_TOKEN:
        return {"hub.challenge": hub_challenge}
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def webhook_listener(request: Request, session: Session = Depends(get_session)):
    """Receive Strava webhook events."""
    data = await request.json()
    logger.info(f"Received webhook: {data}")
    
    # Example data: {'aspect_type': 'create', 'event_time': 1682851200, 'object_id': 12345678, 'object_type': 'activity', 'owner_id': 99999, 'subscription_id': 111111}
    if data.get("object_type") == "activity" and data.get("aspect_type") == "create":
        activity_id = data.get("object_id")
        strava_id = data.get("owner_id")
        # TODO: Trigger background task to fetch and process activity
        
    return {"status": "ok"}
