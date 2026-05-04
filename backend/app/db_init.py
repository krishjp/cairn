from sqlmodel import SQLModel
from app.core.db import engine
from app.models.models import *  # noqa


def init_db():
    SQLModel.metadata.create_all(engine)
    print("Database tables created successfully.")


if __name__ == "__main__":
    init_db()
