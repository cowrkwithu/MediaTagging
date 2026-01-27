'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileVideo, Image as ImageIcon, Folder, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadVideo, uploadImage } from '@/lib/api';

type FileType = 'video' | 'image' | null;

interface UploadFile {
  id: string;
  file: File;
  type: FileType;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  resultId?: string;
}

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

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadFile[] = [];
    const invalidFiles: string[] = [];

    fileArray.forEach((file) => {
      const type = getFileType(file);
      if (type) {
        validFiles.push({
          id: generateId(),
          file,
          type,
          status: 'pending',
          progress: 0,
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`지원하지 않는 파일 형식: ${invalidFiles.slice(0, 3).join(', ')}${invalidFiles.length > 3 ? ` 외 ${invalidFiles.length - 3}개` : ''}`);
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

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

    const items = e.dataTransfer.items;
    const allFiles: File[] = [];

    // 폴더 드롭 지원을 위한 재귀 함수
    const traverseFileTree = (item: FileSystemEntry, path: string = ''): Promise<void> => {
      return new Promise((resolve) => {
        if (item.isFile) {
          (item as FileSystemFileEntry).file((file) => {
            allFiles.push(file);
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = (item as FileSystemDirectoryEntry).createReader();
          dirReader.readEntries(async (entries) => {
            for (const entry of entries) {
              await traverseFileTree(entry, path + item.name + '/');
            }
            resolve();
          });
        }
      });
    };

    const processItems = async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }

      await Promise.all(promises);

      if (allFiles.length > 0) {
        addFiles(allFiles);
      }
    };

    processItems();
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeAllFiles = () => {
    setFiles([]);
    setError(null);
  };

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<void> => {
    const updateProgress = (progress: number) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, progress, status: 'uploading' } : f
        )
      );
    };

    try {
      let resultId: string;

      if (uploadFile.type === 'video') {
        const result = await uploadVideo(uploadFile.file, updateProgress);
        resultId = result.id;
      } else {
        const result = await uploadImage(uploadFile.file, updateProgress);
        resultId = result.id;
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'completed', progress: 100, resultId }
            : f
        )
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: '업로드 실패' }
            : f
        )
      );
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setError(null);

    // 동시에 최대 3개씩 업로드
    const concurrentLimit = 3;
    const chunks: UploadFile[][] = [];

    for (let i = 0; i < pendingFiles.length; i += concurrentLimit) {
      chunks.push(pendingFiles.slice(i, i + concurrentLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(uploadSingleFile));
    }

    setUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const videoCount = files.filter((f) => f.type === 'video').length;
  const imageCount = files.filter((f) => f.type === 'image').length;

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">파일 업로드</h1>
        {files.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            동영상 {videoCount}개, 사진 {imageCount}개
          </div>
        )}
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
        `}
      >
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            <FileVideo className="w-10 h-10 text-gray-400" />
            <ImageIcon className="w-10 h-10 text-gray-400" />
            <Folder className="w-10 h-10 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-medium">파일 또는 폴더를 드래그하거나 선택하세요</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              동영상: MP4, MOV, AVI, MKV, WebM, WMV, FLV
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              사진: JPG, PNG, GIF, WebP, BMP, TIFF
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              여러 파일 또는 폴더를 한번에 업로드할 수 있습니다
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            {/* 파일 선택 버튼 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              파일 선택
            </button>

            {/* 폴더 선택 버튼 */}
            <input
              ref={folderInputRef}
              type="file"
              /* @ts-expect-error webkitdirectory is not in types */
              webkitdirectory="true"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              폴더 선택
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              업로드 대기 ({files.length}개 파일)
            </h2>
            <button
              onClick={removeAllFiles}
              disabled={uploading}
              className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              전체 삭제
            </button>
          </div>

          {/* 상태 요약 */}
          {(completedCount > 0 || errorCount > 0) && (
            <div className="flex gap-4 text-sm">
              {completedCount > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  완료: {completedCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  실패: {errorCount}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  대기: {pendingCount}
                </span>
              )}
            </div>
          )}

          {/* 파일 리스트 */}
          <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {/* 파일 타입 아이콘 */}
                <div className="flex-shrink-0">
                  {uploadFile.type === 'video' ? (
                    <FileVideo className="w-8 h-8 text-blue-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-green-500" />
                  )}
                </div>

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={uploadFile.file.name}>
                    {uploadFile.file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {uploadFile.type === 'video' ? '동영상' : '사진'} · {formatFileSize(uploadFile.file.size)}
                  </p>
                  {/* 업로드 진행률 바 */}
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-1 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadFile.status === 'error' && (
                    <p className="text-sm text-red-500">{uploadFile.error}</p>
                  )}
                </div>

                {/* 상태 아이콘 / 삭제 버튼 */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {uploadFile.status === 'uploading' && (
                    <span className="text-sm text-blue-500">{uploadFile.progress}%</span>
                  )}
                  {getStatusIcon(uploadFile.status)}
                  {uploadFile.status === 'completed' && uploadFile.resultId && (
                    <button
                      onClick={() => router.push(`/${uploadFile.type === 'video' ? 'videos' : 'images'}/${uploadFile.resultId}`)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      보기
                    </button>
                  )}
                  {(uploadFile.status === 'pending' || uploadFile.status === 'error') && (
                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploading}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 업로드 버튼 */}
      {files.length > 0 && (
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={pendingCount === 0 || uploading}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
              ${pendingCount > 0 && !uploading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'}
            `}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                {pendingCount}개 파일 업로드
              </>
            )}
          </button>

          {completedCount > 0 && !uploading && (
            <button
              onClick={() => {
                const firstVideo = files.find((f) => f.type === 'video' && f.status === 'completed');
                const firstImage = files.find((f) => f.type === 'image' && f.status === 'completed');

                if (videoCount >= imageCount && firstVideo) {
                  router.push('/videos');
                } else if (firstImage) {
                  router.push('/images');
                }
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              목록으로 이동
            </button>
          )}
        </div>
      )}
    </div>
  );
}
