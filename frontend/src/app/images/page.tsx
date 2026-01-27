'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Image as ImageIcon, HardDrive, Tag } from 'lucide-react';
import { getImages } from '@/lib/api';
import type { Image as ImageType } from '@/types';

const statusLabels: Record<string, { label: string; color: string }> = {
  uploaded: { label: '업로드됨', color: 'bg-gray-500' },
  processing: { label: '처리 중', color: 'bg-yellow-500' },
  tagged: { label: '태깅 완료', color: 'bg-green-500' },
  error: { label: '오류', color: 'bg-red-500' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function ImageCard({ image }: { image: ImageType }) {
  const status = statusLabels[image.status] || statusLabels.uploaded;

  return (
    <Link
      href={`/images/${image.id}`}
      className="block border rounded-lg hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        {image.thumbnail_path ? (
          <img
            src={`/api/images/${image.id}/thumbnail`}
            alt={image.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs text-white rounded-full ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-medium truncate mb-1">
          {image.title || image.filename}
        </h3>
        {image.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {image.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {image.width && image.height && (
            <span>{image.width} x {image.height}</span>
          )}
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatFileSize(image.file_size)}
          </span>
          {image.tags && image.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {image.tags.length}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ImagesPage() {
  const { data: images, isLoading, error } = useQuery({
    queryKey: ['images'],
    queryFn: getImages,
    staleTime: 0, // 항상 최신 데이터 확인
    refetchOnMount: 'always', // 페이지 마운트 시 항상 refetch
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
        사진 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사진 목록</h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          새 사진 업로드
        </Link>
      </div>

      {images && images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>등록된 사진이 없습니다.</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            첫 번째 사진을 업로드하세요
          </Link>
        </div>
      )}
    </div>
  );
}
