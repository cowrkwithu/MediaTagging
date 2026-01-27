import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    start_time = Column(Float, nullable=False)  # seconds
    end_time = Column(Float, nullable=False)  # seconds
    thumbnail_path = Column(String(1000))
    clip_path = Column(String(1000))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    video = relationship("Video", back_populates="scenes")
    tags = relationship("SceneTag", back_populates="scene", cascade="all, delete-orphan")
