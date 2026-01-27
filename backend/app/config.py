from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/editVideoTagging"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:27b"

    # Storage
    storage_path: str = "/home/john/editVideoTagging/storage"

    # Scene Detection
    scene_threshold: float = 20.0  # Lower = more sensitive (detects more scenes)
    scene_min_length: int = 10  # Minimum scene length in frames
    scene_frames_per_scene: int = 3  # Number of frames to extract per scene for AI analysis

    # Server
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
