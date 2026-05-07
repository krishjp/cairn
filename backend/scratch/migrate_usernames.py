from app.core.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column exists
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='username'")).fetchone()
        if not res:
            print("Adding username column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN username TEXT"))
            conn.commit()

        # Get users
        print("Populating usernames...")
        users = conn.execute(text("SELECT id, display_name FROM users")).fetchall()
        seen = set()
        for uid, name in users:
            base = (name or "hiker").lower().replace(" ", "")
            uname = base
            count = 1
            while uname in seen:
                uname = f"{base}{count}"
                count += 1
            seen.add(uname)
            conn.execute(text("UPDATE users SET username = :u WHERE id = :i"), {"u": uname, "i": uid})
        
        conn.commit()

        # Now add constraints
        print("Applying constraints...")
        conn.execute(text("ALTER TABLE users ALTER COLUMN username SET NOT NULL"))
        conn.execute(text("DROP INDEX IF EXISTS ix_users_username"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_username ON users (username)"))
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
