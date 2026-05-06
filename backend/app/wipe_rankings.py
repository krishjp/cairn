from sqlmodel import Session, create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def wipe_rankings():
    with Session(engine) as session:
        print("Wiping comparisons...")
        session.exec(text("DELETE FROM comparisons"))
        print("Wiping user_route_ratings...")
        session.exec(text("DELETE FROM user_route_ratings"))
        session.commit()
    print("Cleanup complete. All rankings and comparisons have been reset.")

if __name__ == "__main__":
    wipe_rankings()
