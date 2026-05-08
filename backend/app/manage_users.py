import argparse
from typing import Optional
from sqlmodel import Session, select
from app.core.db import engine
from app.models.models import User

def set_admin_status(username: str, status: bool):
    with Session(engine) as session:
        stmt = select(User).where(User.username == username)
        user = session.exec(stmt).first()
        
        if not user:
            print(f"Error: User with username '{username}' not found.")
            return
        
        user.is_admin = status
        session.add(user)
        session.commit()
        
        action = "promoted to admin" if status else "demoted from admin"
        print(f"Successfully {action}: {user.username}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage user roles and status.")
    parser.add_argument("--username", type=str, required=True, help="Username to modify")
    parser.add_argument("--admin", action="store_true", help="Set user as admin")
    parser.add_argument("--no-admin", action="store_true", help="Remove admin status")

    args = parser.parse_args()

    if args.admin:
        set_admin_status(args.username, True)
    elif args.no_admin:
        set_admin_status(args.username, False)
    else:
        print("Please specify --admin or --no-admin")
