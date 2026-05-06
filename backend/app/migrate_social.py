from sqlmodel import Session, create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("Adding notes column...")
        try:
            session.exec(text("ALTER TABLE activities ADD COLUMN notes TEXT"))
            session.commit()
        except Exception as e:
            print(f"Error adding notes: {e}")
            session.rollback()

        print("Adding reactions_count column...")
        try:
            session.exec(text("ALTER TABLE activities ADD COLUMN reactions_count INTEGER DEFAULT 0"))
            session.commit()
        except Exception as e:
            print(f"Error adding reactions_count: {e}")
            session.rollback()

        print("Adding comments_count column...")
        try:
            session.exec(text("ALTER TABLE activities ADD COLUMN comments_count INTEGER DEFAULT 0"))
            session.commit()
        except Exception as e:
            print(f"Error adding comments_count: {e}")
            session.rollback()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
