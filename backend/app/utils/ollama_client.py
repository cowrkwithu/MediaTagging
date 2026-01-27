import httpx
import base64
import os
from typing import Optional, List
from app.config import get_settings

settings = get_settings()


class OllamaClient:
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model

    async def generate(self, prompt: str, model: Optional[str] = None) -> str:
        """Generate text using Ollama"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model or self.model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120.0
            )
            response.raise_for_status()
            return response.json().get("response", "")

    async def generate_with_images(self, prompt: str, image_paths: List[str], model: Optional[str] = None) -> str:
        """Generate text using Ollama with image input (vision)"""
        # Encode images to base64
        images_base64 = []
        for image_path in image_paths:
            if os.path.exists(image_path):
                with open(image_path, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")
                    images_base64.append(image_data)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model or self.model,
                    "prompt": prompt,
                    "images": images_base64,
                    "stream": False
                },
                timeout=180.0  # Longer timeout for vision processing
            )
            response.raise_for_status()
            return response.json().get("response", "")

    async def generate_tags(self, description: str) -> list[str]:
        """Generate tags from description"""
        prompt = f"""다음 비디오 설명을 바탕으로 관련 태그를 1-10개 생성하라.
태그만 한 줄에 하나씩 작성하고, 번호나 기호 없이 한국어로만 작성하라.

설명: {description}

태그:"""

        response = await self.generate(prompt)
        tags = [tag.strip() for tag in response.strip().split("\n") if tag.strip()]
        # Filter out lines that look like explanations or numbering
        tags = [t for t in tags if not t.startswith(('-', '*', '•')) and len(t) < 30]
        return tags[:10]

    async def generate_scene_tags_with_vision(self, image_paths: List[str], context: str) -> list[str]:
        """Generate tags for a scene using vision model"""
        prompt = f"""이 이미지들은 비디오의 한 장면에서 추출한 프레임들이다.

{context}

이 장면에서 보이는 내용을 분석하고 관련 태그를 3-7개 생성하라.
- 장면에 보이는 객체, 사람, 동작, 배경, 분위기 등을 태그로 작성하라
- 태그만 한 줄에 하나씩 작성하고, 번호나 기호 없이 한국어로만 작성하라
- 실제 이미지에서 보이는 내용만 태그로 작성하라

태그:"""

        try:
            response = await self.generate_with_images(prompt, image_paths)
            tags = [tag.strip() for tag in response.strip().split("\n") if tag.strip()]
            # Filter out lines that look like explanations or numbering
            tags = [t for t in tags if not t.startswith(('-', '*', '•', '1', '2', '3', '4', '5', '6', '7', '8', '9')) and len(t) < 30]
            # Remove common prefixes
            cleaned_tags = []
            for tag in tags:
                # Remove numbering like "1. ", "- " etc
                import re
                cleaned = re.sub(r'^[\d\.\-\*\•\s]+', '', tag).strip()
                if cleaned and len(cleaned) < 30:
                    cleaned_tags.append(cleaned)
            return cleaned_tags[:7]
        except Exception as e:
            print(f"Error generating scene tags with vision: {e}")
            return []

    async def analyze_scene(self, image_paths: List[str], video_filename: str) -> str:
        """Analyze a scene and generate a description"""
        prompt = f"""이 이미지들은 '{video_filename}' 비디오의 한 장면에서 추출한 프레임들이다.

이 장면에서 보이는 내용을 1-2문장으로 간단히 설명하라.
- 보이는 객체, 사람, 동작, 배경 등을 설명하라
- 반드시 한국어로만 작성하고, "~이다", "~한다" 형식의 문체를 사용하라

설명:"""

        try:
            response = await self.generate_with_images(prompt, image_paths)
            return response.strip()
        except Exception as e:
            print(f"Error analyzing scene: {e}")
            return ""

    async def generate_summary(self, content: str) -> str:
        """Generate summary from content"""
        prompt = f"""다음 비디오 내용을 2-3문장으로 요약하라.
반드시 한국어로만 작성하고, "~이다", "~한다" 형식의 문체를 사용하라.

내용: {content}

요약:"""

        return await self.generate(prompt)


ollama_client = OllamaClient()
