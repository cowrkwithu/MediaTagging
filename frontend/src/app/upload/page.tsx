'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileVideo, Image as ImageIcon } from 'lucide-react';
import { uploadVideo, uploadImage } from '@/lib/api';

type FileType = 'video' | 'image' | null;

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];

function getFileType(file: File): FileType {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith('video/')) {
    return 'video';
  }
  if (IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith('image/')) {
    return 'image';
  }
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    const type = getFileType(droppedFile);

    if (type) {
      setFile(droppedFile);
      setFileType(type);
      setError(null);
    } else {
      setError('동영상 또는 사진 파일만 업로드할 수 있습니다.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const type = getFileType(selectedFile);
      if (type) {
        setFile(selectedFile);
        setFileType(type);
        setError(null);
      } else {
        setError('동영상 또는 사진 파일만 업로드할 수 있습니다.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !fileType) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      if (fileType === 'video') {
        const video = await uploadVideo(file, (progress) => {
          setUploadProgress(progress);
        });
        router.push(`/videos/${video.id}`);
      } else {
        const image = await uploadImage(file, (progress) => {
          setUploadProgress(progress);
        });
        router.push(`/images/${image.id}`);
      }
    } catch (err) {
      setError('업로드 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">파일 업로드</h1>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
          ${!file ? 'cursor-pointer' : ''}
        `}
      >
        {!file ? (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="video/*,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                <FileVideo className="w-10 h-10 text-gray-400" />
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium">동영상 또는 사진을 드래그하거나 클릭하세요</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  동영상: MP4, MOV, AVI, MKV 등
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  사진: JPG, PNG, GIF, WebP 등
                </p>
              </div>
            </div>
          </label>
        ) : (
          <div className="space-y-4">
            {fileType === 'video' ? (
              <FileVideo className="w-12 h-12 mx-auto text-green-500" />
            ) : (
              <ImageIcon className="w-12 h-12 mx-auto text-green-500" />
            )}
            <div>
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {fileType === 'video' ? '동영상' : '사진'} · {formatFileSize(file.size)}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setFileType(null);
              }}
              className="text-red-500 hover:text-red-600"
            >
              <X className="w-5 h-5 inline mr-1" />
              파일 제거
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {uploading ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">업로드 중...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {file && `${formatFileSize(Math.round(file.size * uploadProgress / 100))} / ${formatFileSize(file.size)}`}
          </p>
        </div>
      ) : (
        <button
          onClick={handleUpload}
          disabled={!file}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            ${file
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'}
          `}
        >
          업로드
        </button>
      )}
    </div>
  );
}
