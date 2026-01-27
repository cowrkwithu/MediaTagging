from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.schemas.video import TagResponse


class SceneResponse(BaseModel):
    id: UUID
    video_id: UUID
    start_time: float
    end_time: float
    thumbnail_path: Optional[str] = None
    clip_path: Optional[str] = None
    tags: List[TagResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True
