from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    conn.execute(text("UPDATE alembic_version SET version_num = '371f525cb33d'"))
    conn.commit()
    print("Stamped to 371f525cb33d")
