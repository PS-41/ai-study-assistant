# backend/db.py
import os
from flask import g
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base

# Define Base here
Base = declarative_base()

_engine = None
_Session = None

def init_db(app):
    """Initialize engine/session and create tables."""
    global _engine, _Session

    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "app.sqlite"))
    database_url = app.config.get("DATABASE_URL", f"sqlite:///{db_path}")

    _engine = create_engine(database_url, future=True)
    _Session = scoped_session(
        sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    )

    # IMPORT HERE to avoid circular import
    from backend import models  # noqa: F401

    # Create all tables for models that subclass Base
    Base.metadata.create_all(_engine)

    # Apply schema migrations (add missing columns, etc.)
    run_schema_migrations(_engine)
    # ensure_optional_user_id_column(_engine)

def run_schema_migrations(engine):
    """
    Runs simple SQLite migrations by checking for missing columns and adding them.
    This keeps DB backward-compatible without manual SQL.
    """
    with engine.connect() as conn:
        # Inspect columns in documents table
        cols = conn.execute(text("PRAGMA table_info(documents)")).fetchall()
        col_names = {c[1] for c in cols}

        # 1. user_id column
        if "user_id" not in col_names:
            conn.execute(text("ALTER TABLE documents ADD COLUMN user_id INTEGER NULL"))

        # 2. course_id column
        if "course_id" not in col_names:
            conn.execute(text("ALTER TABLE documents ADD COLUMN course_id INTEGER NULL"))

        # 3. topic_id column
        if "topic_id" not in col_names:
            conn.execute(text("ALTER TABLE documents ADD COLUMN topic_id INTEGER NULL"))

def get_db():
    """Return a request-scoped SQLAlchemy session."""
    if "db" not in g:
        g.db = _Session()
    return g.db

def close_db(e=None):
    """Close the session at end of request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()
