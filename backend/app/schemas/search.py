from pydantic import BaseModel
from typing import Optional, List, Union
from uuid import UUID

from app.schemas.video import VideoResponse
from app.schemas.scene import SceneResponse


class SearchQuery(BaseModel):
    and_tags: Optional[List[str]] = None
    or_tags: Optional[List[str]] = None
    not_tags: Optional[List[str]] = None
    target: List[str] = ["videos", "scenes"]
    page: int = 1
    limit: int = 20


class SearchResponse(BaseModel):
    videos: List[VideoResponse] = []
    scenes: List[SceneResponse] = []
    total: int
    page: int
    limit: int
