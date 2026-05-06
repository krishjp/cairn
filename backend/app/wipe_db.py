from sqlalchemy import create_engine, text
from app.core.config import settings
from app.models.models import SQLModel

def wipe_db():
    engine = create_engine(settings.DATABASE_URL)
    
    # 1. Drop all tables managed by SQLModel
    print("Dropping all app tables...")
    SQLModel.metadata.drop_all(engine)
    
    # 2. Drop alembic_version specifically
    with engine.begin() as conn:
        print("Dropping alembic_version...")
        conn.execute(text('DROP TABLE IF EXISTS alembic_version'))
        
    print("Database wipe complete. State is now clean.")

if __name__ == "__main__":
    wipe_db()
