# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from backend.db import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)       # stored filename on disk
    original_name = Column(String, nullable=False)  # original name from user
    mime_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
