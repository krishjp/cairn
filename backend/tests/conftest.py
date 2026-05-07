import pytest
from sqlmodel import Session, select
import uuid
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


from app.api.deps import get_current_user, get_current_admin_user
from app.models.models import User

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    def mock_get_current_user():
        # Return the first user in the session or a dummy one
        all_users = session.exec(select(User)).all()
        if all_users:
            user = all_users[-1]
            return user
            
        user = User(display_name="Test User", id=uuid.uuid4())
        session.add(user)
        session.commit()
        return user

    def mock_get_current_admin_user():
        user = mock_get_current_user()
        user.is_admin = True
        session.add(user)
        session.commit()
        return user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_admin_user] = mock_get_current_admin_user
    
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
