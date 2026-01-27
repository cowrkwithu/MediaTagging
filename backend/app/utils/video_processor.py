import os
import subprocess
from typing import Optional
from app.config import get_settings

settings = get_settings()


class VideoProcessor:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or settings.storage_path

    def get_video_info(self, file_path: str) -> dict:
        """Get video information using ffprobe"""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"ffprobe error: {result.stderr}")

        import json
        return json.loads(result.stdout)

    def get_duration(self, file_path: str) -> float:
        """Get video duration in seconds"""
        info = self.get_video_info(file_path)
        return float(info.get("format", {}).get("duration", 0))

    def extract_clip(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        end_time: float
    ) -> str:
        """Extract a clip from video with re-encoding for accuracy"""
        duration = end_time - start_time
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),  # Seek before input for speed
            "-i", input_path,
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"ffmpeg error: {result.stderr}")
        return output_path

    def extract_thumbnail(
        self,
        input_path: str,
        output_path: str,
        time: float
    ) -> str:
        """Extract a thumbnail from video"""
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ss", str(time),
            "-vframes", "1",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"ffmpeg error: {result.stderr}")
        return output_path


video_processor = VideoProcessor()
