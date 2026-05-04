from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.core.db import get_session
from app.models.models import User, Follow
import uuid

router = APIRouter()


@router.post("/{user_id}/follow/{target_id}")
def follow_user(
    user_id: uuid.UUID, target_id: uuid.UUID, session: Session = Depends(get_session)
):
    """Follow another user. If target is private, create a pending request."""
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")

    target = session.get(User, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = session.get(Follow, (user_id, target_id))
    if existing:
        return {"status": existing.status}

    # If target is private, set status to pending
    status = "pending" if target.is_private else "accepted"

    follow = Follow(follower_id=user_id, followed_id=target_id, status=status)
    session.add(follow)
    session.commit()

    return {"status": status}


@router.get("/{user_id}/pending-requests", response_model=List[uuid.UUID])
def get_pending_requests(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Get IDs of users who have requested to follow you."""
    statement = select(Follow.follower_id).where(
        Follow.followed_id == user_id, Follow.status == "pending"
    )
    return session.exec(statement).all()


@router.post("/{user_id}/approve/{follower_id}")
def approve_follow(
    user_id: uuid.UUID, follower_id: uuid.UUID, session: Session = Depends(get_session)
):
    """Approve a pending follow request."""
    follow = session.get(Follow, (follower_id, user_id))
    if not follow or follow.status != "pending":
        raise HTTPException(status_code=404, detail="Follow request not found.")

    follow.status = "accepted"
    session.add(follow)
    session.commit()

    return {"status": "success"}


@router.patch("/{user_id}/privacy")
def update_privacy(
    user_id: uuid.UUID, is_private: bool, session: Session = Depends(get_session)
):
    """Update user privacy settings."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_private = is_private
    session.add(user)
    session.commit()
    return {"status": "success", "is_private": user.is_private}
