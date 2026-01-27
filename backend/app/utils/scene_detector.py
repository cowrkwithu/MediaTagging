from scenedetect import detect, ContentDetector, AdaptiveDetector
from typing import List, Tuple
from app.config import get_settings

settings = get_settings()


class SceneDetector:
    def __init__(self, threshold: float = None, min_scene_len: int = None):
        """
        Initialize scene detector.

        Args:
            threshold: Detection threshold (lower = more sensitive)
            min_scene_len: Minimum scene length in frames
        """
        self.threshold = threshold if threshold is not None else settings.scene_threshold
        self.min_scene_len = min_scene_len if min_scene_len is not None else settings.scene_min_length

    def detect_scenes(self, video_path: str) -> List[Tuple[float, float]]:
        """
        Detect scenes in a video.

        Args:
            video_path: Path to the video file

        Returns:
            List of (start_time, end_time) tuples in seconds
        """
        try:
            # Use ContentDetector for scene detection
            scene_list = detect(
                video_path,
                ContentDetector(threshold=self.threshold, min_scene_len=self.min_scene_len)
            )

            # Convert to (start_seconds, end_seconds) tuples
            scenes = []
            for scene in scene_list:
                start_time = scene[0].get_seconds()
                end_time = scene[1].get_seconds()
                scenes.append((start_time, end_time))

            return scenes

        except Exception as e:
            print(f"Error detecting scenes: {e}")
            # Return entire video as single scene on error
            return []

    def detect_scenes_adaptive(self, video_path: str) -> List[Tuple[float, float]]:
        """
        Detect scenes using adaptive detection (better for varying content).

        Args:
            video_path: Path to the video file

        Returns:
            List of (start_time, end_time) tuples in seconds
        """
        try:
            scene_list = detect(
                video_path,
                AdaptiveDetector(min_scene_len=self.min_scene_len)
            )

            scenes = []
            for scene in scene_list:
                start_time = scene[0].get_seconds()
                end_time = scene[1].get_seconds()
                scenes.append((start_time, end_time))

            return scenes

        except Exception as e:
            print(f"Error detecting scenes: {e}")
            return []


scene_detector = SceneDetector()
