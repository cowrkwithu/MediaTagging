import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    title = Column(String(500))
    description = Column(Text)  # AI-generated description
    user_notes = Column(Text)
    file_path = Column(String(1000), nullable=False)
    thumbnail_path = Column(String(1000))  # Resized version for display
    width = Column(Integer)  # pixels
    height = Column(Integer)  # pixels
    file_size = Column(BigInteger)  # bytes
    status = Column(String(50), nullable=False, default="uploaded")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tags = relationship("ImageTag", back_populates="image", cascade="all, delete-orphan")
