import os
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Optional

from app.config import get_settings
from app.models.image import Image
from app.models.tag import Tag, ImageTag
from app.utils.ollama_client import ollama_client

settings = get_settings()


class ImageTaggingService:
    def __init__(self):
        self.ollama = ollama_client

    async def generate_description(self, image_id: UUID, db: Session) -> Optional[str]:
        """Generate AI description for an image using vision"""
        image = db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return None

        if not os.path.exists(image.file_path):
            print(f"Image file not found: {image.file_path}")
            return None

        prompt = f"""이 이미지를 분석하고 내용을 2-3문장으로 설명하라.
파일명: {image.filename}

- 이미지에 보이는 주요 객체, 사람, 배경, 분위기를 설명하라
- 반드시 한국어로만 작성하고, "~이다", "~한다" 형식의 문체를 사용하라

설명:"""

        try:
            description = await self.ollama.generate_with_images(prompt, [image.file_path])
            image.description = description.strip()
            db.commit()
            return image.description
        except Exception as e:
            print(f"Error generating image description: {e}")
            return None

    async def generate_image_tags(self, image_id: UUID, db: Session) -> list[str]:
        """Generate AI tags for an image using vision"""
        image = db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return []

        if not os.path.exists(image.file_path):
            print(f"Image file not found: {image.file_path}")
            return []

        prompt = f"""이 이미지를 분석하고 관련 태그를 5-15개 생성하라.
파일명: {image.filename}
{f'설명: {image.description}' if image.description else ''}

- 이미지에 보이는 객체, 사람, 동작, 배경, 분위기, 색상, 스타일 등을 태그로 작성하라
- 태그만 한 줄에 하나씩 작성하고, 번호나 기호 없이 한국어로만 작성하라
- 실제 이미지에서 보이는 내용만 태그로 작성하라

태그:"""

        try:
            response = await self.ollama.generate_with_images(prompt, [image.file_path])
            tags = [tag.strip() for tag in response.strip().split("\n") if tag.strip()]

            # Filter out lines that look like explanations or numbering
            import re
            cleaned_tags = []
            for tag in tags:
                # Remove numbering like "1. ", "- " etc
                cleaned = re.sub(r'^[\d\.\-\*\•\s]+', '', tag).strip()
                if cleaned and len(cleaned) < 30 and not cleaned.startswith(('-', '*', '•')):
                    cleaned_tags.append(cleaned)

            created_tags = []
            for tag_name in cleaned_tags[:15]:
                tag_name = tag_name.strip()
                if not tag_name:
                    continue

                # Find or create tag
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.add(tag)
                    db.flush()

                # Check if image_tag already exists
                existing = db.query(ImageTag).filter(
                    ImageTag.image_id == image.id,
                    ImageTag.tag_id == tag.id
                ).first()

                if not existing:
                    image_tag = ImageTag(image_id=image.id, tag_id=tag.id)
                    db.add(image_tag)
                    created_tags.append(tag_name)

            db.commit()
            print(f"Generated {len(created_tags)} tags for image: {created_tags}")
            return created_tags
        except Exception as e:
            print(f"Error generating image tags: {e}")
            return []

    async def clear_existing_tags(self, image_id: UUID, db: Session) -> None:
        """Clear existing AI-generated tags for re-tagging"""
        # Delete image tags (but keep user-defined tags with confidence=1.0)
        db.query(ImageTag).filter(
            ImageTag.image_id == image_id,
            ImageTag.confidence != 1.0
        ).delete()
        db.commit()
        print(f"Cleared existing AI tags for image {image_id}")

    async def process_image(self, image_id: UUID, db: Session) -> dict:
        """Full tagging process for an image"""
        image = db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return {"error": "Image not found"}

        # Clear existing AI-generated tags if re-tagging
        if image.status == "tagged":
            print(f"Re-tagging image: {image.filename}, clearing existing AI tags...")
            await self.clear_existing_tags(image_id, db)

        image.status = "processing"
        db.commit()

        result = {
            "image_id": str(image_id),
            "description": None,
            "tags": [],
            "status": "processing"
        }

        try:
            print(f"=== Starting tagging process for image: {image.filename} ===")

            # Step 1: Generate image description
            print("Step 1: Generating image description...")
            description = await self.generate_description(image_id, db)
            result["description"] = description
            print(f"Description: {description[:100]}..." if description and len(description) > 100 else f"Description: {description}")

            # Step 2: Generate tags
            print("Step 2: Generating image tags...")
            tags = await self.generate_image_tags(image_id, db)
            result["tags"] = tags
            print(f"Tags: {tags}")

            # Update status
            image.status = "tagged"
            db.commit()
            result["status"] = "tagged"

            print(f"=== Tagging complete for image: {image.filename} ===")

        except Exception as e:
            print(f"Error during image tagging: {e}")
            import traceback
            traceback.print_exc()
            image.status = "error"
            db.commit()
            result["status"] = "error"
            result["error"] = str(e)

        return result


image_tagging_service = ImageTaggingService()
