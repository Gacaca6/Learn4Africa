"""
Learn4Africa — Legacy SQLAlchemy Models

NOTE: The auth / tracks / users / portfolio flow uses MongoDB (see
`models/mongo.py`). This file only exists for the legacy `courses`
subsystem which predates Mongo. We keep the engine *lazy* so that a
missing Postgres connection string does NOT crash the backend on
startup — the auth flow is the critical path and must not be blocked
by an optional legacy dependency.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON,
    create_engine,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

from config import settings
from utils.time import now_utc

Base = declarative_base()

_engine = None
_SessionLocal = None


def get_engine():
    """Lazily create the SQLAlchemy engine. Returns None if unavailable."""
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine
    url = getattr(settings, "database_url", "") or ""
    if not url:
        return None
    try:
        _engine = create_engine(url, pool_pre_ping=True)
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=_engine
        )
        return _engine
    except Exception as exc:  # pragma: no cover
        print(f"[database] SQLAlchemy engine unavailable: {exc}")
        return None


def get_db():
    """Yield a legacy SQLAlchemy session, or None if Postgres is offline."""
    engine = get_engine()
    if engine is None or _SessionLocal is None:
        yield None
        return
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Users ──

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    language = Column(String(5), default="en")
    learning_style = Column(String(20), default="visual")  # visual, auditory, reading, kinesthetic
    age_group = Column(String(20), default="general")  # child, teen, adult, general
    created_at = Column(DateTime, default=now_utc)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="user")
    progress = relationship("LearnerProgress", back_populates="user")
    gamification = relationship("GamificationProfile", back_populates="user", uselist=False)


# ── Courses ──

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    language = Column(String(5), default="en")
    difficulty = Column(String(20), default="beginner")  # beginner, intermediate, advanced
    category = Column(String(100))
    cover_image = Column(String(500))
    is_ai_generated = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    # Relationships
    chapters = relationship("Chapter", back_populates="course", order_by="Chapter.order")
    enrollments = relationship("Enrollment", back_populates="course")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=now_utc)

    course = relationship("Course", back_populates="chapters")
    lessons = relationship("Lesson", back_populates="chapter", order_by="Lesson.order")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=False)
    title = Column(String(255), nullable=False)
    order = Column(Integer, nullable=False)

    # Content in all 8 formats
    reading_content = Column(Text)          # Markdown lesson text
    flashcards_data = Column(JSON)          # [{front, back}, ...]
    quiz_data = Column(JSON)                # [{question, options, answer, type}, ...]
    podcast_url = Column(String(500))       # Path to generated audio
    lecture_url = Column(String(500))       # Path to generated video
    comic_panels = Column(JSON)             # [{image_url, caption}, ...]
    game_config = Column(JSON)              # Game parameters
    song_url = Column(String(500))          # Path to generated song

    created_at = Column(DateTime, default=now_utc)

    chapter = relationship("Chapter", back_populates="lessons")


# ── Learning Progress ──

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, default=now_utc)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class LearnerProgress(Base):
    __tablename__ = "learner_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False)
    format_type = Column(String(20))  # reading, flashcard, quiz, podcast, lecture, comic, game, song
    score = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="progress")


# ── Gamification ──

class GamificationProfile(Base):
    __tablename__ = "gamification_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_days = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active = Column(DateTime, default=now_utc)
    badges = Column(JSON, default=list)  # ["first_lesson", "week_streak", ...]

    user = relationship("User", back_populates="gamification")


# ── Tutor Conversations ──

class TutorConversation(Base):
    __tablename__ = "tutor_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=True)
    messages = Column(JSON, default=list)  # [{role, content, timestamp}, ...]
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
