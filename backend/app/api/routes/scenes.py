import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.database import get_db
from app.models.scene import Scene
from app.models.video import Video
from app.models.tag import Tag, SceneTag
from app.utils.video_processor import video_processor
from app.config import get_settings

router = APIRouter()
settings = get_settings()


class SceneTagResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class SceneDetailResponse(BaseModel):
    id: str
    video_id: str
    video_filename: str
    start_time: float
    end_time: float
    duration: float
    thumbnail_path: Optional[str]
    clip_path: Optional[str]
    tags: List[SceneTagResponse]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/{scene_id}", response_model=SceneDetailResponse)
async def get_scene(scene_id: UUID, db: Session = Depends(get_db)):
    """Get scene details with tags"""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    video = db.query(Video).filter(Video.id == scene.video_id).first()

    # Get tags for this scene
    scene_tags = db.query(Tag).join(SceneTag).filter(
        SceneTag.scene_id == scene.id
    ).all()

    return SceneDetailResponse(
        id=str(scene.id),
        video_id=str(scene.video_id),
        video_filename=video.filename if video else "Unknown",
        start_time=scene.start_time,
        end_time=scene.end_time,
        duration=scene.end_time - scene.start_time,
        thumbnail_path=scene.thumbnail_path,
        clip_path=scene.clip_path,
        tags=[SceneTagResponse(id=str(t.id), name=t.name) for t in scene_tags],
        created_at=scene.created_at.isoformat()
    )


@router.get("/{scene_id}/download")
async def download_scene(scene_id: UUID, db: Session = Depends(get_db)):
    """Download scene as video file"""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    video = db.query(Video).filter(Video.id == scene.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if clip already exists
    if scene.clip_path and os.path.exists(scene.clip_path):
        clip_path = scene.clip_path
    else:
        # Generate clip on demand
        clips_dir = os.path.join(settings.storage_path, "clips", str(scene.video_id))
        os.makedirs(clips_dir, exist_ok=True)

        clip_filename = f"scene_{scene.id}.mp4"
        clip_path = os.path.join(clips_dir, clip_filename)

        try:
            video_processor.extract_clip(
                video.file_path,
                clip_path,
                scene.start_time,
                scene.end_time
            )
            # Update scene with clip path
            scene.clip_path = clip_path
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract clip: {str(e)}")

    # Generate download filename
    base_name = os.path.splitext(video.filename)[0]
    download_name = f"{base_name}_scene_{scene.start_time:.1f}s-{scene.end_time:.1f}s.mp4"

    return FileResponse(
        clip_path,
        media_type="video/mp4",
        filename=download_name
    )


@router.get("/{scene_id}/thumbnail")
async def get_scene_thumbnail(scene_id: UUID, db: Session = Depends(get_db)):
    """Get scene thumbnail image"""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    if not scene.thumbnail_path or not os.path.exists(scene.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(
        scene.thumbnail_path,
        media_type="image/jpeg"
    )


class ExportRequest(BaseModel):
    scene_ids: List[str]
    merge: bool = False


class ExportResponse(BaseModel):
    status: str
    files: List[dict]
    merged_file: Optional[str] = None


@router.post("/export", response_model=ExportResponse)
async def export_scenes(request: ExportRequest, db: Session = Depends(get_db)):
    """Export selected scenes as separate videos or merged"""
    exported_files = []
    clips_to_merge = []

    for scene_id_str in request.scene_ids:
        scene_id = UUID(scene_id_str)
        scene = db.query(Scene).filter(Scene.id == scene_id).first()
        if not scene:
            continue

        video = db.query(Video).filter(Video.id == scene.video_id).first()
        if not video:
            continue

        # Generate clip
        clips_dir = os.path.join(settings.storage_path, "clips", str(scene.video_id))
        os.makedirs(clips_dir, exist_ok=True)

        clip_filename = f"scene_{scene.id}.mp4"
        clip_path = os.path.join(clips_dir, clip_filename)

        if not os.path.exists(clip_path):
            try:
                video_processor.extract_clip(
                    video.file_path,
                    clip_path,
                    scene.start_time,
                    scene.end_time
                )
                scene.clip_path = clip_path
                db.commit()
            except Exception as e:
                continue

        clips_to_merge.append(clip_path)
        exported_files.append({
            "scene_id": str(scene.id),
            "video_filename": video.filename,
            "start_time": scene.start_time,
            "end_time": scene.end_time,
            "clip_path": clip_path
        })

    result = ExportResponse(
        status="completed",
        files=exported_files
    )

    # Merge clips if requested
    if request.merge and len(clips_to_merge) > 1:
        try:
            merged_dir = os.path.join(settings.storage_path, "exports")
            os.makedirs(merged_dir, exist_ok=True)

            import uuid
            merged_filename = f"merged_{uuid.uuid4()}.mp4"
            merged_path = os.path.join(merged_dir, merged_filename)

            # Create concat file for ffmpeg
            concat_file = os.path.join(merged_dir, f"concat_{uuid.uuid4()}.txt")
            with open(concat_file, 'w') as f:
                for clip in clips_to_merge:
                    f.write(f"file '{clip}'\n")

            # Merge using ffmpeg
            import subprocess
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c", "copy",
                merged_path
            ]
            subprocess.run(cmd, capture_output=True, check=True)

            # Clean up concat file
            os.remove(concat_file)

            result.merged_file = merged_path
        except Exception as e:
            print(f"Error merging clips: {e}")

    return result


@router.get("/export/{filename}/download")
async def download_merged(filename: str):
    """Download merged export file"""
    file_path = os.path.join(settings.storage_path, "exports", filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found")

    return FileResponse(
        file_path,
        media_type="video/mp4",
        filename=filename
    )
