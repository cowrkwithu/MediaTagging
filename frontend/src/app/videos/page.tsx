'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Video, Clock, HardDrive, Tag } from 'lucide-react';
import { getVideos } from '@/lib/api';
import type { Video as VideoType } from '@/types';

const statusLabels: Record<string, { label: string; color: string }> = {
  uploaded: { label: '업로드됨', color: 'bg-gray-500' },
  processing: { label: '처리 중', color: 'bg-yellow-500' },
  tagged: { label: '태깅 완료', color: 'bg-green-500' },
  error: { label: '오류', color: 'bg-red-500' },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function VideoCard({ video }: { video: VideoType }) {
  const status = statusLabels[video.status] || statusLabels.uploaded;

  return (
    <Link
      href={`/videos/${video.id}`}
      className="block p-4 border rounded-lg hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Video className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">
              {video.title || video.filename}
            </h3>
            <span className={`px-2 py-0.5 text-xs text-white rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
          {video.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {video.summary}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(video.duration)}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-4 h-4" />
              {formatFileSize(video.file_size)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function VideosPage() {
  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['videos'],
    queryFn: getVideos,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        동영상 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">동영상 목록</h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          새 동영상 업로드
        </Link>
      </div>

      {videos && videos.length > 0 ? (
        <div className="grid gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>등록된 동영상이 없습니다.</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            첫 번째 동영상을 업로드하세요
          </Link>
        </div>
      )}
    </div>
  );
}
