export interface VideoTagInfo {
  id: string;
  name: string;
  confidence: number | null;
}

export interface Video {
  id: string;
  filename: string;
  title: string | null;
  summary: string | null;
  user_notes: string | null;
  file_path: string;
  duration: number | null;
  file_size: number | null;
  status: VideoStatus;
  tags: VideoTagInfo[];
  created_at: string;
  updated_at: string;
}

export type VideoStatus = 'uploaded' | 'processing' | 'tagged' | 'error';

export interface Scene {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  thumbnail_path: string | null;
  clip_path: string | null;
  user_notes: string | null;
  created_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  video_count?: number;
  scene_count?: number;
  image_count?: number;
  created_at?: string;
}

export type ImageStatus = 'uploaded' | 'processing' | 'tagged' | 'error';

export interface ImageTagInfo {
  id: string;
  name: string;
  confidence: number | null;
}

export interface Image {
  id: string;
  filename: string;
  title: string | null;
  description: string | null;
  user_notes: string | null;
  file_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  status: ImageStatus;
  tags: ImageTagInfo[];
  created_at: string;
  updated_at: string;
}

export interface VideoTag {
  id: string;
  video_id: string;
  tag_id: string;
  confidence: number | null;
  created_at: string;
  tag?: Tag;
}

export interface SceneTag {
  id: string;
  scene_id: string;
  tag_id: string;
  confidence: number | null;
  created_at: string;
  tag?: Tag;
}

export interface SearchQuery {
  and_tags?: string[];
  or_tags?: string[];
  not_tags?: string[];
  target?: ('videos' | 'scenes' | 'images')[];
  page?: number;
  limit?: number;
}

export interface VideoSearchResult {
  id: string;
  filename: string;
  title: string | null;
  summary: string | null;
  duration: number | null;
  status: string;
  tags: string[];
  created_at: string;
}

export interface SceneSearchResult {
  id: string;
  video_id: string;
  video_filename: string;
  start_time: number;
  end_time: number;
  thumbnail_path: string | null;
  tags: string[];
}

export interface ImageSearchResult {
  id: string;
  filename: string;
  title: string | null;
  description: string | null;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  status: string;
  tags: string[];
  created_at: string;
}

export interface SearchResult {
  videos: VideoSearchResult[];
  scenes: SceneSearchResult[];
  images: ImageSearchResult[];
  total_videos: number;
  total_scenes: number;
  total_images: number;
  page: number;
  limit: number;
}
