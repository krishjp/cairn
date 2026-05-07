from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.models import User, Follow
import uuid

router = APIRouter()


@router.post("/follow/{target_id}")
def follow_user(
    target_id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Follow another user. If target is private, create a pending request."""
    if current_user.id == target_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")

    target = session.get(User, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = session.get(Follow, (current_user.id, target_id))
    if existing:
        return {"status": existing.status}

    # If target is private, set status to pending
    status = "pending" if target.is_private else "accepted"

    follow = Follow(follower_id=current_user.id, followed_id=target_id, status=status)
    session.add(follow)
    session.commit()

    return {"status": status}


@router.get("/pending-requests", response_model=List[uuid.UUID])
def get_pending_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get IDs of users who have requested to follow you."""
    statement = select(Follow.follower_id).where(
        Follow.followed_id == current_user.id, Follow.status == "pending"
    )
    return session.exec(statement).all()


@router.post("/approve/{follower_id}")
def approve_follow(
    follower_id: uuid.UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Approve a pending follow request."""
    follow = session.get(Follow, (follower_id, current_user.id))
    if not follow or follow.status != "pending":
        raise HTTPException(status_code=404, detail="Follow request not found.")

    follow.status = "accepted"
    session.add(follow)
    session.commit()

    return {"status": "success"}


@router.patch("/privacy")
def update_privacy(
    is_private: bool, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update user privacy settings."""
    current_user.is_private = is_private
    session.add(current_user)
    session.commit()
    return {"status": "success", "is_private": current_user.is_private}
