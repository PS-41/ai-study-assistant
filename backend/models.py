# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, func, Table
from sqlalchemy.orm import relationship
from backend.db import Base

# --- Association Tables for Many-to-Many relationships ---

quiz_documents = Table(
    "quiz_documents",
    Base.metadata,
    Column("quiz_id", Integer, ForeignKey("quizzes.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

summary_documents = Table(
    "summary_documents",
    Base.metadata,
    Column("summary_id", Integer, ForeignKey("summaries.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

flashcard_set_documents = Table(
    "flashcard_set_documents",
    Base.metadata,
    Column("set_id", Integer, ForeignKey("flashcard_sets.id"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id"), primary_key=True),
)

# --- Models ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Organization (Optional)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    
    course = relationship("Course", back_populates="documents")
    topic = relationship("Topic", back_populates="documents")

class Summary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True)
    # No single document_id anymore
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    title = Column(String, nullable=True)  # e.g. "Summary of Week 1"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # M2M relationship
    sources = relationship("Document", secondary=summary_documents, backref="summaries")

class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id = Column(Integer, primary_key=True)
    # No single document_id anymore
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False, default="Flashcards")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # M2M relationship
    sources = relationship("Document", secondary=flashcard_set_documents, backref="flashcard_sets")
    cards = relationship("Flashcard", back_populates="set", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True)
    set_id = Column(Integer, ForeignKey("flashcard_sets.id"), nullable=False)
    front = Column(Text, nullable=False)   # question / prompt / term
    back = Column(Text, nullable=False)    # answer / explanation
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    set = relationship("FlashcardSet", back_populates="cards")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True)
    # No single document_id anymore
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # M2M relationship
    sources = relationship("Document", secondary=quiz_documents, backref="quizzes")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    qtype = Column(String, nullable=False)   # "mcq"
    prompt = Column(Text, nullable=False)
    options = Column(Text, nullable=False)   # e.g., "A|||B|||C|||D"
    answer = Column(String, nullable=False)  # exact option text
    explanation = Column(Text)
    quiz = relationship("Quiz")

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    score_pct = Column(Integer, nullable=True)
    quiz = relationship("Quiz")

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    # relationships
    topics = relationship("Topic", back_populates="course", cascade="all, delete-orphan", lazy="selectin")
    documents = relationship("Document", back_populates="course", lazy="selectin")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    # relationships
    course = relationship("Course", back_populates="topics")
    documents = relationship("Document", back_populates="topic", lazy="selectin")