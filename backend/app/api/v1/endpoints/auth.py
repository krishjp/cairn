from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.models import User
from app.core.security import create_access_token
from app.api.deps import get_current_admin_user
import uuid

router = APIRouter()

@router.post("/mock-login")
async def mock_login(
    display_name: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Mock login for development/testing.
    Creates a user if it doesn't exist and returns a JWT token.
    'display_name' is used as the username.
    """
    uname = display_name.lower().replace(" ", "")
    if uname.startswith("@"):
        uname = uname[1:]

    # Try to find user by username
    stmt = select(User).where(User.username == uname)
    user = session.exec(stmt).first()
    
    if not user:
        user = User(display_name=display_name, username=uname)
        session.add(user)
        session.commit()
        session.refresh(user)
    
    access_token = create_access_token(subject=str(user.id))
    return {
        "status": "success",
        "token": access_token,
        "user": user
    }
