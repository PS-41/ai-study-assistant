# backend/db.py
import os
from flask import g
from sqlalchemy import create_engine
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
