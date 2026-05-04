import pytest
from sqlmodel import Session
from app.main import app
from app.core.db import engine, get_session
from fastapi.testclient import TestClient


@pytest.fixture(name="session")
def session_fixture():
    # For unit tests, we'll use a transaction that rolls back to keep the DB clean
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
