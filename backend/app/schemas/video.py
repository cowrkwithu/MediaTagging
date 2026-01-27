from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class VideoCreate(BaseModel):
    title: Optional[str] = None
    user_notes: Optional[str] = None


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    user_notes: Optional[str] = None


class TagResponse(BaseModel):
    id: UUID
    name: str
    confidence: Optional[float] = None

    class Config:
        from_attributes = True


class VideoResponse(BaseModel):
    id: UUID
    filename: str
    title: Optional[str] = None
    summary: Optional[str] = None
    user_notes: Optional[str] = None
    file_path: str
    duration: Optional[int] = None
    file_size: Optional[int] = None
    status: str
    tags: List[TagResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
