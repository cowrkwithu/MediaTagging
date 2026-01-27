import os
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Optional, List

from app.config import get_settings
from app.models.video import Video
from app.models.scene import Scene
from app.models.tag import Tag, VideoTag, SceneTag
from app.utils.video_processor import video_processor
from app.utils.scene_detector import scene_detector
from app.utils.ollama_client import ollama_client

settings = get_settings()


class TaggingService:
    def __init__(self):
        self.ollama = ollama_client
        self.processor = video_processor
        self.frames_per_scene = settings.scene_frames_per_scene

    async def generate_summary(self, video_id: UUID, db: Session) -> Optional[str]:
        """Generate AI summary for a video using vision analysis"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return None

        # Extract multiple thumbnails for better context
        thumbnails_dir = os.path.join(settings.storage_path, "thumbnails", str(video_id))
        os.makedirs(thumbnails_dir, exist_ok=True)

        frame_paths = []
        duration = video.duration or 60

        # Extract frames at 25%, 50%, 75% of video duration
        for i, ratio in enumerate([0.25, 0.5, 0.75]):
            time_pos = max(1, duration * ratio)
            thumbnail_path = os.path.join(thumbnails_dir, f"summary_frame_{i}.jpg")
            try:
                self.processor.extract_thumbnail(video.file_path, thumbnail_path, time_pos)
                frame_paths.append(thumbnail_path)
            except Exception as e:
                print(f"Warning: Could not extract thumbnail at {time_pos}s: {e}")

        # Generate summary using vision if we have frames
        prompt_context = f"""비디오 파일명: {video.filename}
길이: {video.duration or '알 수 없음'} 초

{'이 이미지들은 비디오의 여러 시점에서 추출한 프레임들이다. 이미지와 메타데이터를 바탕으로' if frame_paths else '위의 파일명과 메타데이터를 바탕으로'} 이 비디오의 내용을 간단히 설명하라.
반드시 한국어로만 2-3문장으로 작성하고, "~이다", "~한다" 형식의 문체를 사용하라. 영어 번역이나 부연 설명 없이 한국어만 사용하라."""

        try:
            if frame_paths:
                summary = await self.ollama.generate_with_images(prompt_context, frame_paths)
            else:
                summary = await self.ollama.generate(prompt_context)
            video.summary = summary.strip()
            db.commit()
            return video.summary
        except Exception as e:
            print(f"Error generating summary: {e}")
            return None

    def extract_scene_frames(self, video_path: str, scene: Scene, output_dir: str) -> List[str]:
        """Extract multiple frames from a scene for AI analysis"""
        frame_paths = []
        scene_duration = scene.end_time - scene.start_time

        # Calculate frame extraction times (evenly distributed)
        num_frames = min(self.frames_per_scene, max(1, int(scene_duration / 2)))  # At least 1 frame per 2 seconds

        for i in range(num_frames):
            # Distribute frames evenly across the scene
            if num_frames == 1:
                time_offset = scene_duration / 2
            else:
                time_offset = (i + 1) * scene_duration / (num_frames + 1)

            frame_time = scene.start_time + time_offset
            frame_filename = f"scene_{scene.id}_frame_{i}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)

            try:
                self.processor.extract_thumbnail(video_path, frame_path, frame_time)
                frame_paths.append(frame_path)
            except Exception as e:
                print(f"Warning: Could not extract frame at {frame_time}s: {e}")

        return frame_paths

    async def detect_and_save_scenes(self, video_id: UUID, db: Session) -> List[Scene]:
        """Detect scenes in video and save to database"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return []

        try:
            # Detect scenes using PySceneDetect
            scene_times = scene_detector.detect_scenes(video.file_path)

            if not scene_times:
                # If no scenes detected, treat entire video as one scene
                duration = video.duration or self.processor.get_duration(video.file_path)
                scene_times = [(0.0, duration)]

            print(f"Detected {len(scene_times)} scenes in video {video_id}")

            created_scenes = []
            thumbnails_dir = os.path.join(settings.storage_path, "thumbnails", str(video_id))
            os.makedirs(thumbnails_dir, exist_ok=True)

            for i, (start_time, end_time) in enumerate(scene_times):
                # Create scene record
                scene = Scene(
                    video_id=video.id,
                    start_time=start_time,
                    end_time=end_time
                )
                db.add(scene)
                db.flush()  # Get scene.id

                # Extract thumbnail at middle of scene (for display)
                mid_time = (start_time + end_time) / 2
                thumbnail_filename = f"scene_{scene.id}.jpg"
                thumbnail_path = os.path.join(thumbnails_dir, thumbnail_filename)

                try:
                    self.processor.extract_thumbnail(video.file_path, thumbnail_path, mid_time)
                    scene.thumbnail_path = thumbnail_path
                except Exception as e:
                    print(f"Warning: Could not extract scene thumbnail: {e}")

                created_scenes.append(scene)
                print(f"Created scene {i+1}: {start_time:.1f}s - {end_time:.1f}s")

            db.commit()
            return created_scenes

        except Exception as e:
            print(f"Error detecting scenes: {e}")
            db.rollback()
            return []

    async def generate_scene_tags(self, scene: Scene, video: Video, db: Session) -> list[str]:
        """Generate AI tags for a specific scene using vision analysis"""
        # Extract frames from this scene for AI analysis
        thumbnails_dir = os.path.join(settings.storage_path, "thumbnails", str(video.id))
        os.makedirs(thumbnails_dir, exist_ok=True)

        frame_paths = self.extract_scene_frames(video.file_path, scene, thumbnails_dir)

        # Build context for this scene
        scene_position = '초반' if scene.start_time < 10 else '중반' if scene.start_time < (video.duration or 60) * 0.7 else '후반'
        context = f"""비디오 파일명: {video.filename}
비디오 요약: {video.summary or '없음'}
장면 구간: {scene.start_time:.1f}초 - {scene.end_time:.1f}초 (길이: {scene.end_time - scene.start_time:.1f}초)
장면 위치: 비디오 {scene_position}"""

        try:
            # Use vision model if we have frames, otherwise fall back to text-only
            if frame_paths:
                print(f"Analyzing scene with {len(frame_paths)} frames using vision model")
                tags = await self.ollama.generate_scene_tags_with_vision(frame_paths, context)
            else:
                # Fallback to text-based tagging
                fallback_context = f"""{context}

장면 타이밍과 비디오 맥락을 바탕으로 이 특정 장면에 대한 관련 태그를 생성하라.
한국어로 2-5개의 태그를 생성하라. 태그만 한 줄에 하나씩 작성하라."""
                tags = await self.ollama.generate_tags(fallback_context)

            created_tags = []
            for tag_name in tags[:7]:
                tag_name = tag_name.strip()
                if not tag_name:
                    continue

                # Find or create tag
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.add(tag)
                    db.flush()

                # Check if scene_tag already exists
                existing = db.query(SceneTag).filter(
                    SceneTag.scene_id == scene.id,
                    SceneTag.tag_id == tag.id
                ).first()

                if not existing:
                    scene_tag = SceneTag(scene_id=scene.id, tag_id=tag.id)
                    db.add(scene_tag)
                    created_tags.append(tag_name)

            db.commit()
            print(f"Generated {len(created_tags)} tags for scene: {created_tags}")
            return created_tags
        except Exception as e:
            print(f"Error generating scene tags: {e}")
            return []

    async def generate_video_tags(self, video_id: UUID, db: Session) -> list[str]:
        """Generate AI tags for a video"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return []

        # Generate tags using filename and existing summary
        context = f"""비디오 파일명: {video.filename}
요약: {video.summary or '없음'}
길이: {video.duration or '알 수 없음'} 초

위 정보를 바탕으로 이 비디오에 대한 관련 태그를 생성하라.
한국어로 3-10개의 태그를 생성하라. 태그만 한 줄에 하나씩 작성하라."""

        try:
            tags = await self.ollama.generate_tags(context)

            created_tags = []
            for tag_name in tags[:10]:
                tag_name = tag_name.strip()
                if not tag_name:
                    continue

                # Find or create tag
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.add(tag)
                    db.flush()

                # Check if video_tag already exists
                existing = db.query(VideoTag).filter(
                    VideoTag.video_id == video.id,
                    VideoTag.tag_id == tag.id
                ).first()

                if not existing:
                    video_tag = VideoTag(video_id=video.id, tag_id=tag.id)
                    db.add(video_tag)
                    created_tags.append(tag_name)

            db.commit()
            return created_tags
        except Exception as e:
            print(f"Error generating tags: {e}")
            return []

    async def clear_existing_tags(self, video_id: UUID, db: Session) -> None:
        """Clear existing AI-generated tags and scenes for re-tagging"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return

        # Delete existing scene tags and scenes
        for scene in video.scenes:
            # Delete scene tags (but keep user-defined tags with confidence=1.0)
            db.query(SceneTag).filter(
                SceneTag.scene_id == scene.id,
                SceneTag.confidence != 1.0  # Keep user-defined tags
            ).delete()
            # Delete scene
            db.delete(scene)

        # Delete video tags (but keep user-defined tags with confidence=1.0)
        db.query(VideoTag).filter(
            VideoTag.video_id == video_id,
            VideoTag.confidence != 1.0  # Keep user-defined tags
        ).delete()

        db.commit()
        print(f"Cleared existing AI tags for video {video_id}")

    async def aggregate_video_tags_from_scenes(self, video_id: UUID, db: Session) -> list[str]:
        """Aggregate most common tags from all scenes to video level"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return []

        # Get all scene tags for this video
        from collections import Counter
        tag_counts = Counter()

        for scene in video.scenes:
            scene_tags = db.query(Tag).join(SceneTag).filter(
                SceneTag.scene_id == scene.id
            ).all()
            for tag in scene_tags:
                tag_counts[tag.name] += 1

        # Add most common tags to video level (tags that appear in at least 2 scenes or if only 1 scene)
        num_scenes = len(video.scenes)
        min_count = 1 if num_scenes <= 2 else 2

        created_tags = []
        for tag_name, count in tag_counts.most_common(10):
            if count >= min_count:
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if tag:
                    existing = db.query(VideoTag).filter(
                        VideoTag.video_id == video.id,
                        VideoTag.tag_id == tag.id
                    ).first()

                    if not existing:
                        video_tag = VideoTag(video_id=video.id, tag_id=tag.id)
                        db.add(video_tag)
                        created_tags.append(tag_name)

        db.commit()
        return created_tags

    async def process_video(self, video_id: UUID, db: Session) -> dict:
        """Full tagging process for a video with scene-level tagging"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return {"error": "Video not found"}

        # Clear existing AI-generated tags if re-tagging
        if video.status == "tagged":
            print(f"Re-tagging video: {video.filename}, clearing existing AI tags...")
            await self.clear_existing_tags(video_id, db)

        video.status = "processing"
        db.commit()

        result = {
            "video_id": str(video_id),
            "summary": None,
            "tags": [],
            "scenes": [],
            "status": "processing"
        }

        try:
            print(f"=== Starting tagging process for video: {video.filename} ===")

            # Step 1: Generate video summary (using vision)
            print("Step 1: Generating video summary...")
            summary = await self.generate_summary(video_id, db)
            result["summary"] = summary
            print(f"Summary: {summary[:100]}..." if summary and len(summary) > 100 else f"Summary: {summary}")

            # Step 2: Detect scenes and extract thumbnails
            print("Step 2: Detecting scenes...")
            scenes = await self.detect_and_save_scenes(video_id, db)
            print(f"Detected {len(scenes)} scenes")

            result["scenes"] = [
                {
                    "id": str(s.id),
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "thumbnail_path": s.thumbnail_path,
                    "tags": []
                }
                for s in scenes
            ]

            # Step 3: Generate tags for each scene (using vision)
            print("Step 3: Generating scene-specific tags...")
            video = db.query(Video).filter(Video.id == video_id).first()  # Refresh
            for i, scene in enumerate(scenes):
                print(f"  Processing scene {i+1}/{len(scenes)} ({scene.start_time:.1f}s - {scene.end_time:.1f}s)...")
                scene_tags = await self.generate_scene_tags(scene, video, db)
                if i < len(result["scenes"]):
                    result["scenes"][i]["tags"] = scene_tags

            # Step 4: Aggregate scene tags to video level
            print("Step 4: Aggregating tags to video level...")
            video_tags = await self.aggregate_video_tags_from_scenes(video_id, db)
            result["tags"] = video_tags
            print(f"Video-level tags: {video_tags}")

            # Also generate some general video tags
            general_tags = await self.generate_video_tags(video_id, db)
            result["tags"].extend([t for t in general_tags if t not in result["tags"]])

            # Update status
            video.status = "tagged"
            db.commit()
            result["status"] = "tagged"

            print(f"=== Tagging complete for video: {video.filename} ===")

        except Exception as e:
            print(f"Error during tagging: {e}")
            import traceback
            traceback.print_exc()
            video.status = "error"
            db.commit()
            result["status"] = "error"
            result["error"] = str(e)

        return result


tagging_service = TaggingService()
