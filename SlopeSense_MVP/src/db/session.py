import os
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
default_sqlite_path = os.path.join(project_root, "slopesense.db").replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_sqlite_path}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from src.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Lightweight SQLite column schema migrations
    with engine.connect() as conn:
        migrations = [
            "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN verification_otp VARCHAR(10)",
            "ALTER TABLE users ADD COLUMN verification_otp_expires_at DATETIME",
            "ALTER TABLE users ADD COLUMN trust_score FLOAT DEFAULT 50.0",
            "ALTER TABLE users ADD COLUMN reputation_points INTEGER DEFAULT 10",
            "ALTER TABLE users ADD COLUMN verified_reports_count INTEGER DEFAULT 0",
            "ALTER TABLE incident_reports ADD COLUMN landmark_description VARCHAR(300)",
            "ALTER TABLE incident_reports ADD COLUMN reporter_trust_score FLOAT DEFAULT 50.0",
            "ALTER TABLE incident_reports ADD COLUMN points_awarded INTEGER DEFAULT 0",
            "ALTER TABLE incident_reports ADD COLUMN admin_notes TEXT",
        ]
        for query in migrations:
            try:
                conn.execute(text(query))
                conn.commit()
            except Exception:
                pass

    print(f"[Database] Initialized tables and verified schema on engine: {engine.url}")
