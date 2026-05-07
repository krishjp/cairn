from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_
from typing import List, Optional
import uuid

from app.core.db import get_session
from app.models.models import User, Follow
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/me", response_model=User)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user's profile."""
    return current_user


@router.patch("/me", response_model=User)
async def update_my_profile(
    user_update: dict,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update current user's profile."""
    for key, value in user_update.items():
        if hasattr(current_user, key):
            setattr(current_user, key, value)
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.get("/search", response_model=List[dict])
async def search_users(
    query: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Search for users by display name or username."""
    from sqlalchemy import or_
    stmt = select(User).where(
        or_(
            User.display_name.ilike(f"%{query}%"),
            User.username.ilike(f"%{query}%")
        ),
        User.id != current_user.id
    ).limit(20)
    users = session.exec(stmt).all()
    
    result = []
    for user in users:
        # Check follow status
        follow_stmt = select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user.id
        )
        follow = session.exec(follow_stmt).first()
        
        result.append({
            "id": user.id,
            "display_name": user.display_name,
            "username": user.username,
            "is_private": user.is_private,
            "follow_status": follow.status if follow else None
        })
    return result

@router.post("/follow/{user_id}")
async def follow_user(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Send a follow request or follow a public user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Check if already following
    existing_stmt = select(Follow).where(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user_id
    )
    existing = session.exec(existing_stmt).first()
    if existing:
        return {"status": existing.status}
    
    status = "accepted" if not target_user.is_private else "pending"
    new_follow = Follow(
        follower_id=current_user.id,
        followed_id=user_id,
        status=status
    )
    session.add(new_follow)
    session.commit()
    return {"status": status}

@router.post("/unfollow/{user_id}")
async def unfollow_user(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Unfollow a user or cancel a request."""
    follow_stmt = select(Follow).where(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user_id
    )
    follow = session.exec(follow_stmt).first()
    if follow:
        session.delete(follow)
        session.commit()
    return {"message": "Unfollowed successfully."}

@router.get("/requests", response_model=List[dict])
async def get_follow_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List pending follow requests for the current user."""
    stmt = (
        select(Follow, User)
        .join(User, Follow.follower_id == User.id)
        .where(Follow.followed_id == current_user.id, Follow.status == "pending")
    )
    results = session.exec(stmt).all()
    
    return [
        {
            "follower_id": user.id,
            "display_name": user.display_name,
            "created_at": follow.created_at
        }
        for follow, user in results
    ]

@router.post("/requests/{follower_id}/approve")
async def approve_request(
    follower_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a follow request."""
    follow_stmt = select(Follow).where(
        Follow.follower_id == follower_id,
        Follow.followed_id == current_user.id,
        Follow.status == "pending"
    )
    follow = session.exec(follow_stmt).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found.")
    
    follow.status = "accepted"
    session.add(follow)
    session.commit()
    return {"message": "Request approved."}

@router.post("/requests/{follower_id}/reject")
async def reject_request(
    follower_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject a follow request."""
    follow_stmt = select(Follow).where(
        Follow.follower_id == follower_id,
        Follow.followed_id == current_user.id,
        Follow.status == "pending"
    )
    follow = session.exec(follow_stmt).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found.")
    
    session.delete(follow)
    session.commit()
    return {"message": "Request rejected."}

@router.delete("/followers/{follower_id}")
async def remove_follower(
    follower_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a user from your followers."""
    follow_stmt = select(Follow).where(
        Follow.follower_id == follower_id,
        Follow.followed_id == current_user.id,
        Follow.status == "accepted"
    )
    follow = session.exec(follow_stmt).first()
    if follow:
        session.delete(follow)
        session.commit()
    return {"message": "Follower removed."}

@router.get("/friends", response_model=dict)
async def get_friends(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get list of users you follow and users who follow you."""
    # Users I follow
    following_stmt = (
        select(User)
        .join(Follow, Follow.followed_id == User.id)
        .where(Follow.follower_id == current_user.id, Follow.status == "accepted")
    )
    following = session.exec(following_stmt).all()
    
    # Users who follow me
    followers_stmt = (
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.followed_id == current_user.id, Follow.status == "accepted")
    )
    followers = session.exec(followers_stmt).all()
    
    # Pending requests I sent
    sent_stmt = (
        select(User)
        .join(Follow, Follow.followed_id == User.id)
        .where(Follow.follower_id == current_user.id, Follow.status == "pending")
    )
    sent = session.exec(sent_stmt).all()
    
    return {
        "following": [{"id": u.id, "display_name": u.display_name, "username": u.username} for u in following],
        "followers": [{"id": u.id, "display_name": u.display_name, "username": u.username} for u in followers],
        "sent": [{"id": u.id, "display_name": u.display_name, "username": u.username} for u in sent]
    }
