from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.models.database import get_db
from app.models.tag import Tag, VideoTag, SceneTag, ImageTag
from app.models.video import Video
from app.models.scene import Scene
from app.models.image import Image

router = APIRouter()


class SearchQuery(BaseModel):
    and_tags: Optional[List[str]] = None
    or_tags: Optional[List[str]] = None
    not_tags: Optional[List[str]] = None
    target: List[str] = ["videos", "scenes", "images"]
    page: int = 1
    limit: int = 20


class VideoResult(BaseModel):
    id: str
    filename: str
    title: Optional[str]
    summary: Optional[str]
    duration: Optional[int]
    status: str
    tags: List[str]
    created_at: str

    class Config:
        from_attributes = True


class SceneResult(BaseModel):
    id: str
    video_id: str
    video_filename: str
    start_time: float
    end_time: float
    thumbnail_path: Optional[str]
    tags: List[str]

    class Config:
        from_attributes = True


class ImageResult(BaseModel):
    id: str
    filename: str
    title: Optional[str]
    description: Optional[str]
    thumbnail_path: Optional[str]
    width: Optional[int]
    height: Optional[int]
    status: str
    tags: List[str]
    created_at: str

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    videos: List[VideoResult]
    scenes: List[SceneResult]
    images: List[ImageResult]
    total_videos: int
    total_scenes: int
    total_images: int
    page: int
    limit: int


@router.post("", response_model=SearchResponse)
async def search(query: SearchQuery, db: Session = Depends(get_db)):
    """Search videos, scenes, and images by tags with AND/OR/NOT logic"""
    videos = []
    scenes = []
    images = []

    # Search videos
    if "videos" in query.target:
        video_query = db.query(Video)

        # AND tags - video must have ALL these tags
        if query.and_tags:
            for tag_name in query.and_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    video_ids_with_tag = db.query(VideoTag.video_id).filter(
                        VideoTag.tag_id == tag.id
                    ).subquery()
                    video_query = video_query.filter(Video.id.in_(video_ids_with_tag))
                else:
                    # Tag doesn't exist, no results possible
                    video_query = video_query.filter(False)

        # OR tags - video must have AT LEAST ONE of these tags
        if query.or_tags:
            tag_ids = []
            for tag_name in query.or_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    tag_ids.append(tag.id)
            if tag_ids:
                video_ids_with_any_tag = db.query(VideoTag.video_id).filter(
                    VideoTag.tag_id.in_(tag_ids)
                ).subquery()
                video_query = video_query.filter(Video.id.in_(video_ids_with_any_tag))
            else:
                video_query = video_query.filter(False)

        # NOT tags - video must NOT have ANY of these tags
        if query.not_tags:
            for tag_name in query.not_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    video_ids_with_tag = db.query(VideoTag.video_id).filter(
                        VideoTag.tag_id == tag.id
                    ).subquery()
                    video_query = video_query.filter(~Video.id.in_(video_ids_with_tag))

        # Get results with pagination
        total_videos = video_query.count()
        offset = (query.page - 1) * query.limit
        video_results = video_query.order_by(Video.created_at.desc()).offset(offset).limit(query.limit).all()

        for video in video_results:
            video_tags = db.query(Tag.name).join(VideoTag).filter(
                VideoTag.video_id == video.id
            ).all()
            videos.append(VideoResult(
                id=str(video.id),
                filename=video.filename,
                title=video.title,
                summary=video.summary,
                duration=video.duration,
                status=video.status,
                tags=[t[0] for t in video_tags],
                created_at=video.created_at.isoformat()
            ))
    else:
        total_videos = 0

    # Search scenes
    if "scenes" in query.target:
        scene_query = db.query(Scene)

        # AND tags
        if query.and_tags:
            for tag_name in query.and_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    scene_ids_with_tag = db.query(SceneTag.scene_id).filter(
                        SceneTag.tag_id == tag.id
                    ).subquery()
                    scene_query = scene_query.filter(Scene.id.in_(scene_ids_with_tag))
                else:
                    scene_query = scene_query.filter(False)

        # OR tags
        if query.or_tags:
            tag_ids = []
            for tag_name in query.or_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    tag_ids.append(tag.id)
            if tag_ids:
                scene_ids_with_any_tag = db.query(SceneTag.scene_id).filter(
                    SceneTag.tag_id.in_(tag_ids)
                ).subquery()
                scene_query = scene_query.filter(Scene.id.in_(scene_ids_with_any_tag))
            else:
                scene_query = scene_query.filter(False)

        # NOT tags
        if query.not_tags:
            for tag_name in query.not_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    scene_ids_with_tag = db.query(SceneTag.scene_id).filter(
                        SceneTag.tag_id == tag.id
                    ).subquery()
                    scene_query = scene_query.filter(~Scene.id.in_(scene_ids_with_tag))

        # Get results with pagination
        total_scenes = scene_query.count()
        offset = (query.page - 1) * query.limit
        scene_results = scene_query.order_by(Scene.created_at.desc()).offset(offset).limit(query.limit).all()

        for scene in scene_results:
            video = db.query(Video).filter(Video.id == scene.video_id).first()
            scene_tags = db.query(Tag.name).join(SceneTag).filter(
                SceneTag.scene_id == scene.id
            ).all()
            scenes.append(SceneResult(
                id=str(scene.id),
                video_id=str(scene.video_id),
                video_filename=video.filename if video else "Unknown",
                start_time=scene.start_time,
                end_time=scene.end_time,
                thumbnail_path=scene.thumbnail_path,
                tags=[t[0] for t in scene_tags]
            ))
    else:
        total_scenes = 0

    # Search images
    if "images" in query.target:
        image_query = db.query(Image)

        # AND tags
        if query.and_tags:
            for tag_name in query.and_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    image_ids_with_tag = db.query(ImageTag.image_id).filter(
                        ImageTag.tag_id == tag.id
                    ).subquery()
                    image_query = image_query.filter(Image.id.in_(image_ids_with_tag))
                else:
                    image_query = image_query.filter(False)

        # OR tags
        if query.or_tags:
            tag_ids = []
            for tag_name in query.or_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    tag_ids.append(tag.id)
            if tag_ids:
                image_ids_with_any_tag = db.query(ImageTag.image_id).filter(
                    ImageTag.tag_id.in_(tag_ids)
                ).subquery()
                image_query = image_query.filter(Image.id.in_(image_ids_with_any_tag))
            else:
                image_query = image_query.filter(False)

        # NOT tags
        if query.not_tags:
            for tag_name in query.not_tags:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    image_ids_with_tag = db.query(ImageTag.image_id).filter(
                        ImageTag.tag_id == tag.id
                    ).subquery()
                    image_query = image_query.filter(~Image.id.in_(image_ids_with_tag))

        # Get results with pagination
        total_images = image_query.count()
        offset = (query.page - 1) * query.limit
        image_results = image_query.order_by(Image.created_at.desc()).offset(offset).limit(query.limit).all()

        for image in image_results:
            image_tags = db.query(Tag.name).join(ImageTag).filter(
                ImageTag.image_id == image.id
            ).all()
            images.append(ImageResult(
                id=str(image.id),
                filename=image.filename,
                title=image.title,
                description=image.description,
                thumbnail_path=image.thumbnail_path,
                width=image.width,
                height=image.height,
                status=image.status,
                tags=[t[0] for t in image_tags],
                created_at=image.created_at.isoformat()
            ))
    else:
        total_images = 0

    return SearchResponse(
        videos=videos,
        scenes=scenes,
        images=images,
        total_videos=total_videos,
        total_scenes=total_scenes,
        total_images=total_images,
        page=query.page,
        limit=query.limit
    )


class TagResponse(BaseModel):
    id: str
    name: str
    video_count: int
    scene_count: int
    image_count: int

    class Config:
        from_attributes = True


@router.get("/tags", response_model=List[TagResponse])
async def get_tags(db: Session = Depends(get_db)):
    """Get all available tags with usage counts"""
    # Get all tags with video, scene, and image counts
    tags = db.query(Tag).all()

    result = []
    for tag in tags:
        video_count = db.query(VideoTag).filter(VideoTag.tag_id == tag.id).count()
        scene_count = db.query(SceneTag).filter(SceneTag.tag_id == tag.id).count()
        image_count = db.query(ImageTag).filter(ImageTag.tag_id == tag.id).count()
        result.append(TagResponse(
            id=str(tag.id),
            name=tag.name,
            video_count=video_count,
            scene_count=scene_count,
            image_count=image_count
        ))

    # Sort by total usage (video + scene + image count)
    result.sort(key=lambda x: x.video_count + x.scene_count + x.image_count, reverse=True)

    return result
