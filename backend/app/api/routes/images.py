import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from PIL import Image as PILImage

from app.config import get_settings
from app.models.database import get_db
from app.models.image import Image
from app.models.tag import Tag, ImageTag
from app.services.image_tagging_service import image_tagging_service

router = APIRouter()
settings = get_settings()

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'}


def get_image_path(filename: str) -> str:
    """Get full path for image storage"""
    return os.path.join(settings.storage_path, "images", filename)


def get_thumbnail_path(filename: str) -> str:
    """Get full path for image thumbnail storage"""
    return os.path.join(settings.storage_path, "thumbnails", "images", filename)


def image_to_response(image: Image, db: Session) -> dict:
    """Convert Image model to response dict with resolved tags"""
    tags = []
    for image_tag in image.tags:
        tag = db.query(Tag).filter(Tag.id == image_tag.tag_id).first()
        if tag:
            tags.append({
                "id": str(tag.id),
                "name": tag.name,
                "confidence": image_tag.confidence
            })

    return {
        "id": str(image.id),
        "filename": image.filename,
        "title": image.title,
        "description": image.description,
        "user_notes": image.user_notes,
        "file_path": image.file_path,
        "thumbnail_path": image.thumbnail_path,
        "width": image.width,
        "height": image.height,
        "file_size": image.file_size,
        "status": image.status,
        "tags": tags,
        "created_at": image.created_at.isoformat() if image.created_at else None,
        "updated_at": image.updated_at.isoformat() if image.updated_at else None,
    }


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an image file"""
    # Validate file extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # Generate unique filename
    unique_id = uuid.uuid4()
    unique_filename = f"{unique_id}{ext.lower()}"
    file_path = get_image_path(unique_filename)

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

    # Get image dimensions
    width, height = None, None
    try:
        with PILImage.open(file_path) as img:
            width, height = img.size
    except Exception as e:
        print(f"Warning: Could not get image dimensions: {e}")

    # Create thumbnail
    thumbnail_path = None
    try:
        thumb_filename = f"{unique_id}_thumb.jpg"
        thumbnail_path = get_thumbnail_path(thumb_filename)
        os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)

        with PILImage.open(file_path) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            # Create thumbnail (max 400x400)
            img.thumbnail((400, 400), PILImage.Resampling.LANCZOS)
            img.save(thumbnail_path, "JPEG", quality=85)
    except Exception as e:
        print(f"Warning: Could not create thumbnail: {e}")
        thumbnail_path = None

    # Create database record
    try:
        image = Image(
            id=unique_id,
            filename=file.filename,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            width=width,
            height=height,
            file_size=file_size,
            status="uploaded"
        )
        db.add(image)
        db.commit()
        db.refresh(image)
    except Exception as e:
        # Clean up files if DB save fails
        if os.path.exists(file_path):
            os.remove(file_path)
        if thumbnail_path and os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        raise HTTPException(status_code=500, detail=f"Failed to save to database: {str(e)}")

    return image_to_response(image, db)


@router.get("")
async def get_images(db: Session = Depends(get_db)):
    """Get list of all images"""
    images = db.query(Image).order_by(Image.created_at.desc()).all()
    return [image_to_response(img, db) for img in images]


@router.get("/{image_id}")
async def get_image(image_id: UUID, db: Session = Depends(get_db)):
    """Get image details"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image_to_response(image, db)


def parse_hashtags(text: str) -> list[str]:
    """Extract hashtags from text"""
    import re
    pattern = r'#([\w가-힣]+)'
    matches = re.findall(pattern, text)
    return list(set(matches))


def add_user_tags_to_image(image_id: UUID, tag_names: list[str], db: Session) -> None:
    """Add user-defined tags to an image"""
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

        # Add to image tags
        existing_image_tag = db.query(ImageTag).filter(
            ImageTag.image_id == image_id,
            ImageTag.tag_id == tag.id
        ).first()

        if not existing_image_tag:
            image_tag = ImageTag(image_id=image_id, tag_id=tag.id, confidence=1.0)
            db.add(image_tag)


@router.put("/{image_id}")
async def update_image(image_id: UUID, data: dict, db: Session = Depends(get_db)):
    """Update image metadata"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if "title" in data:
        image.title = data["title"]
    if "description" in data:
        image.description = data["description"]
    if "user_notes" in data:
        image.user_notes = data["user_notes"]

    # Parse and add hashtags from user_notes as tags
    if image.user_notes:
        hashtags = parse_hashtags(image.user_notes)
        if hashtags:
            add_user_tags_to_image(image.id, hashtags, db)

    db.commit()
    db.refresh(image)
    return image_to_response(image, db)


@router.delete("/{image_id}")
async def delete_image(image_id: UUID, db: Session = Depends(get_db)):
    """Delete an image"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete files
    if image.file_path and os.path.exists(image.file_path):
        os.remove(image.file_path)
    if image.thumbnail_path and os.path.exists(image.thumbnail_path):
        os.remove(image.thumbnail_path)

    # Delete from database
    db.delete(image)
    db.commit()

    return {"message": "Image deleted", "image_id": str(image_id)}


@router.delete("/{image_id}/tags/{tag_id}")
async def delete_image_tag(image_id: UUID, tag_id: UUID, db: Session = Depends(get_db)):
    """Delete a tag from an image"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Find and delete the image-tag association
    image_tag = db.query(ImageTag).filter(
        ImageTag.image_id == image_id,
        ImageTag.tag_id == tag_id
    ).first()

    if not image_tag:
        raise HTTPException(status_code=404, detail="Tag not found for this image")

    db.delete(image_tag)
    db.commit()

    return {"message": "Tag deleted", "image_id": str(image_id), "tag_id": str(tag_id)}


@router.post("/{image_id}/tagging/start")
async def start_image_tagging(image_id: UUID, db: Session = Depends(get_db)):
    """Start tagging process for an image"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Run tagging process
    result = await image_tagging_service.process_image(image_id, db)
    return result


@router.get("/{image_id}/tagging/status")
async def get_image_tagging_status(image_id: UUID, db: Session = Depends(get_db)):
    """Get tagging status"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return {"image_id": str(image_id), "status": image.status}


@router.get("/{image_id}/file")
async def get_image_file(image_id: UUID, db: Session = Depends(get_db)):
    """Get the actual image file"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if not os.path.exists(image.file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    # Determine content type
    ext = os.path.splitext(image.file_path)[1].lower()
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff',
    }
    content_type = content_types.get(ext, 'application/octet-stream')

    return FileResponse(image.file_path, media_type=content_type)


@router.get("/{image_id}/thumbnail")
async def get_image_thumbnail(image_id: UUID, db: Session = Depends(get_db)):
    """Get the image thumbnail"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Use thumbnail if available, otherwise use original
    if image.thumbnail_path and os.path.exists(image.thumbnail_path):
        return FileResponse(image.thumbnail_path, media_type='image/jpeg')
    elif os.path.exists(image.file_path):
        return FileResponse(image.file_path)
    else:
        raise HTTPException(status_code=404, detail="Image file not found")
