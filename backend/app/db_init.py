from sqlmodel import SQLModel
from app.core.db import engine
# Import all models to ensure they are registered with SQLModel.metadata
from app.models.models import User, CanonicalRoute, Activity, Comparison

def init_db():
    SQLModel.metadata.create_all(engine)
    print("Database tables created successfully.")

if __name__ == "__main__":
    init_db()
