from fastapi import APIRouter
from typing import List
from uuid import UUID
from pydantic import BaseModel

router = APIRouter()


class NanobanaRequest(BaseModel):
    video_ids: List[UUID] = []
    scene_ids: List[UUID] = []
    options: dict = {}


@router.post("/nanobana/request")
async def request_nanobana(request: NanobanaRequest):
    """Request video creation via Google Nanobana API"""
    # TODO: Implement Nanobana API request
    return {
        "request_id": "placeholder",
        "status": "submitted",
        "video_ids": [str(vid) for vid in request.video_ids],
        "scene_ids": [str(sid) for sid in request.scene_ids]
    }


@router.get("/nanobana/status/{request_id}")
async def get_nanobana_status(request_id: str):
    """Get Nanobana request status"""
    # TODO: Implement status check
    return {"request_id": request_id, "status": "pending"}
