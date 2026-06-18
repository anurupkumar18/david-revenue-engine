import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = Path(os.environ.get("ICP_STUDIO_DATA_DIR", Path.home() / ".icp-studio"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATA_DIR / 'data.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_path() -> str:
    return str(DATA_DIR / "data.db")


def ensure_migrations() -> None:
    """Add columns to existing SQLite DBs without dropping data."""
    import sqlite3

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(icp_profiles)").fetchall()}
        if "revenue_state_json" not in cols:
            conn.execute(
                "ALTER TABLE icp_profiles ADD COLUMN revenue_state_json TEXT NOT NULL DEFAULT '{}'"
            )
            conn.commit()
        # Phase 2: associate profiles with a workspace owner. Nullable so existing
        # rows and the keyless demo keep working.
        if "user_id" not in cols:
            conn.execute("ALTER TABLE icp_profiles ADD COLUMN user_id INTEGER")
            conn.commit()

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS email_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                provider VARCHAR(32) NOT NULL,
                email_address VARCHAR(255) NOT NULL,
                access_token_enc TEXT DEFAULT '',
                refresh_token_enc TEXT NOT NULL DEFAULT '',
                token_expires_at DATETIME,
                scopes TEXT DEFAULT '[]',
                status VARCHAR(32) DEFAULT 'active',
                last_error TEXT,
                connected_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
