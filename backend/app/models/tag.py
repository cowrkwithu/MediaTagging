import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    video_tags = relationship("VideoTag", back_populates="tag", cascade="all, delete-orphan")
    scene_tags = relationship("SceneTag", back_populates="tag", cascade="all, delete-orphan")
    image_tags = relationship("ImageTag", back_populates="tag", cascade="all, delete-orphan")


class VideoTag(Base):
    __tablename__ = "video_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id"), nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    video = relationship("Video", back_populates="tags")
    tag = relationship("Tag", back_populates="video_tags")


class SceneTag(Base):
    __tablename__ = "scene_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scene_id = Column(UUID(as_uuid=True), ForeignKey("scenes.id"), nullable=False)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id"), nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    scene = relationship("Scene", back_populates="tags")
    tag = relationship("Tag", back_populates="scene_tags")


class ImageTag(Base):
    __tablename__ = "image_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id"), nullable=False)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id"), nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    image = relationship("Image", back_populates="tags")
    tag = relationship("Tag", back_populates="image_tags")
