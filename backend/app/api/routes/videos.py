import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.config import get_settings
from app.models.database import get_db
from app.models.video import Video
from app.models.tag import Tag, VideoTag
from app.schemas.video import VideoResponse, VideoUpdate, TagResponse
from app.utils.video_processor import video_processor
from app.services.tagging_service import tagging_service

router = APIRouter()
settings = get_settings()

ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv'}


def video_to_response(video: Video, db: Session) -> dict:
    """Convert Video model to response dict with resolved tags"""
    # Get tag names for this video
    tags = []
    for video_tag in video.tags:
        tag = db.query(Tag).filter(Tag.id == video_tag.tag_id).first()
        if tag:
            tags.append(TagResponse(
                id=tag.id,
                name=tag.name,
                confidence=video_tag.confidence
            ))

    return {
        "id": video.id,
        "filename": video.filename,
        "title": video.title,
        "summary": video.summary,
        "user_notes": video.user_notes,
        "file_path": video.file_path,
        "duration": video.duration,
        "file_size": video.file_size,
        "status": video.status,
        "tags": tags,
        "created_at": video.created_at,
        "updated_at": video.updated_at,
    }


def get_video_path(filename: str) -> str:
    """Get full path for video storage"""
    return os.path.join(settings.storage_path, "videos", filename)


@router.post("/upload", response_model=VideoResponse)
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a video file"""
    # Validate file extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate unique filename
    unique_id = uuid.uuid4()
    unique_filename = f"{unique_id}{ext.lower()}"
    file_path = get_video_path(unique_filename)

    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Save file
    try:
        file_size = 0
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # Read 1MB chunks
                await out_file.write(content)
                file_size += len(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Extract video duration using FFmpeg
    duration = None
    try:
        duration = int(video_processor.get_duration(file_path))
    except Exception as e:
        # Log error but continue - duration is optional
        print(f"Warning: Could not extract video duration: {e}")

    # Create database record
    try:
        video = Video(
            id=unique_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            duration=duration,
            status="uploaded"
        )
        db.add(video)
        db.commit()
        db.refresh(video)
    except Exception as e:
        # Clean up file if DB save fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save to database: {str(e)}")

    return video


@router.get("", response_model=List[VideoResponse])
async def get_videos(db: Session = Depends(get_db)):
    """Get list of all videos"""
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    return [video_to_response(v, db) for v in videos]


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(video_id: UUID, db: Session = Depends(get_db)):
    """Get video details"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video_to_response(video, db)


def parse_hashtags(text: str) -> list[str]:
    """Extract hashtags from text"""
    import re
    # Match #word patterns (supports Korean, English, numbers)
    pattern = r'#([\w가-힣]+)'
    matches = re.findall(pattern, text)
    return list(set(matches))  # Remove duplicates


def add_user_tags(video_id: UUID, tag_names: list[str], db: Session) -> None:
    """Add user-defined tags to a video and all its scenes"""
    from app.models.scene import Scene
    from app.models.tag import SceneTag

    # Get all scenes for this video
    scenes = db.query(Scene).filter(Scene.video_id == video_id).all()

    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue

        # Find or create tag
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
            db.flush()

        # Add to video tags
        existing_video_tag = db.query(VideoTag).filter(
            VideoTag.video_id == video_id,
            VideoTag.tag_id == tag.id
        ).first()

        if not existing_video_tag:
            video_tag = VideoTag(video_id=video_id, tag_id=tag.id, confidence=1.0)
            db.add(video_tag)

        # Add to all scene tags
        for scene in scenes:
            existing_scene_tag = db.query(SceneTag).filter(
                SceneTag.scene_id == scene.id,
                SceneTag.tag_id == tag.id
            ).first()

            if not existing_scene_tag:
                scene_tag = SceneTag(scene_id=scene.id, tag_id=tag.id, confidence=1.0)
                db.add(scene_tag)


@router.put("/{video_id}", response_model=VideoResponse)
async def update_video(video_id: UUID, video_update: VideoUpdate, db: Session = Depends(get_db)):
    """Update video metadata and parse user-defined tags"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    update_data = video_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(video, field, value)

    # Parse and add hashtags from user_notes as tags
    if video.user_notes:
        hashtags = parse_hashtags(video.user_notes)
        if hashtags:
            add_user_tags(video.id, hashtags, db)

    db.commit()
    db.refresh(video)
    return video_to_response(video, db)


@router.delete("/{video_id}")
async def delete_video(video_id: UUID, db: Session = Depends(get_db)):
    """Delete a video"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete file
    if os.path.exists(video.file_path):
        os.remove(video.file_path)

    # Delete from database
    db.delete(video)
    db.commit()

    return {"message": "Video deleted", "video_id": str(video_id)}


@router.post("/{video_id}/tagging/start")
async def start_tagging(video_id: UUID, db: Session = Depends(get_db)):
    """Start tagging process for a video"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Run tagging process
    result = await tagging_service.process_video(video_id, db)

    return result


@router.get("/{video_id}/tagging/status")
async def get_tagging_status(video_id: UUID, db: Session = Depends(get_db)):
    """Get tagging status"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return {"video_id": str(video_id), "status": video.status}


@router.get("/{video_id}/scenes")
async def get_video_scenes(video_id: UUID, db: Session = Depends(get_db)):
    """Get scenes for a video with tags including confidence values"""
    from app.models.scene import Scene
    from app.models.tag import SceneTag

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Query scenes explicitly ordered by start_time to ensure chronological order
    scenes = db.query(Scene).filter(Scene.video_id == video_id).order_by(Scene.start_time).all()

    scenes_with_tags = []
    for scene in scenes:
        # Get tags for this scene with confidence values
        scene_tag_entries = db.query(SceneTag, Tag).join(Tag).filter(
            SceneTag.scene_id == scene.id
        ).all()

        tags_list = []
        for scene_tag, tag in scene_tag_entries:
            tags_list.append({
                "id": str(tag.id),
                "name": tag.name,
                "confidence": scene_tag.confidence
            })

        scenes_with_tags.append({
            "id": str(scene.id),
            "video_id": str(scene.video_id),
            "start_time": scene.start_time,
            "end_time": scene.end_time,
            "thumbnail_path": scene.thumbnail_path,
            "clip_path": scene.clip_path,
            "user_notes": scene.user_notes,
            "created_at": scene.created_at.isoformat() if scene.created_at else None,
            "tags": tags_list
        })

    return {"video_id": str(video_id), "scenes": scenes_with_tags}


@router.get("/{video_id}/stream")
async def stream_video(video_id: UUID, request: Request, db: Session = Depends(get_db)):
    """Stream video file with range request support"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = os.path.getsize(video.file_path)

    # Get content type based on file extension
    ext = os.path.splitext(video.file_path)[1].lower()
    content_types = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
    }
    content_type = content_types.get(ext, 'video/mp4')

    # Handle range request for video seeking
    range_header = request.headers.get('range')

    if range_header:
        # Parse range header
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1

        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")

        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        async def stream_range():
            async with aiofiles.open(video.file_path, 'rb') as f:
                await f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(1024 * 1024, remaining)  # 1MB chunks
                    chunk = await f.read(read_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            stream_range(),
            status_code=206,
            media_type=content_type,
            headers={
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(chunk_size),
            }
        )
    else:
        # No range request - return full file
        return FileResponse(
            video.file_path,
            media_type=content_type,
            headers={
                'Accept-Ranges': 'bytes',
                'Content-Length': str(file_size),
            }
        )
