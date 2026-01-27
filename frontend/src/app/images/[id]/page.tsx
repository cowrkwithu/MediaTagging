'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Tag as TagIcon, Trash2, Edit2, Save, X, Download } from 'lucide-react';
import Link from 'next/link';
import { getImage, startImageTagging, deleteImage, updateImage, getImageTaggingStatus, deleteImageTag } from '@/lib/api';
import ProcessingStatus from '@/components/ProcessingStatus';

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const imageId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [userTagsInput, setUserTagsInput] = useState('');

  const { data: image, isLoading: imageLoading } = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => getImage(imageId),
  });

  // Poll for status when processing
  const { data: statusData } = useQuery({
    queryKey: ['imageStatus', imageId],
    queryFn: () => getImageTaggingStatus(imageId),
    enabled: image?.status === 'processing',
    refetchInterval: image?.status === 'processing' ? 2000 : false,
  });

  // Refresh data when processing completes
  useEffect(() => {
    if (statusData?.status === 'tagged' && image?.status === 'processing') {
      queryClient.invalidateQueries({ queryKey: ['image', imageId] });
      queryClient.invalidateQueries({ queryKey: ['images'] }); // 목록도 갱신
    }
  }, [statusData?.status, image?.status, queryClient, imageId]);

  const taggingMutation = useMutation({
    mutationFn: () => startImageTagging(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image', imageId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteImage(imageId),
    onSuccess: () => {
      router.push('/images');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string; user_notes?: string }) => updateImage(imageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image', imageId] });
      setIsEditing(false);
      setIsEditingDescription(false);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: ({ imageId, tagId }: { imageId: string; tagId: string }) =>
      deleteImageTag(imageId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image', imageId] });
    },
  });

  const handleDeleteTag = (tagId: string) => {
    if (confirm('이 태그를 삭제하시겠습니까?')) {
      deleteTagMutation.mutate({ imageId, tagId });
    }
  };

  const handleStartEdit = () => {
    setEditTitle(image?.title || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle || undefined,
    });
  };

  const handleStartEditDescription = () => {
    setEditDescription(image?.description || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    updateMutation.mutate({
      description: editDescription || undefined,
    });
  };

  const handleCancelEditDescription = () => {
    setEditDescription(image?.description || '');
    setIsEditingDescription(false);
  };

  const handleStartEditTags = () => {
    setUserTagsInput(image?.user_notes || '');
    setIsEditingTags(true);
  };

  const handleSaveTags = () => {
    updateMutation.mutate({
      user_notes: userTagsInput || undefined,
    }, {
      onSuccess: () => {
        setIsEditingTags(false);
        queryClient.invalidateQueries({ queryKey: ['image', imageId] });
      }
    });
  };

  const handleCancelEditTags = () => {
    setUserTagsInput(image?.user_notes || '');
    setIsEditingTags(false);
  };

  if (imageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!image) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사진을 찾을 수 없습니다.</p>
        <Link href="/images" className="text-blue-600 hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목 입력"
              className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          ) : (
            image.title || image.filename
          )}
        </h1>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEdit}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Image Display */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={`/api/images/${imageId}/file`}
              alt={image.filename}
              className="w-full h-auto max-h-[70vh] object-contain mx-auto"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">AI 요약</h3>
              {!isEditingDescription && (
                <button
                  onClick={handleStartEditDescription}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  편집
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="사진 설명을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDescription}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelEditDescription}
                    className="py-2 px-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleStartEditDescription}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
              >
                {image.description ? (
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{image.description}</p>
                ) : (
                  <p className="text-gray-400 text-sm">클릭하여 설명을 추가하세요</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3">정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">상태</span>
                <ProcessingStatus status={image.status as 'uploaded' | 'processing' | 'tagged' | 'error'} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">파일명</span>
                <span className="truncate ml-2">{image.filename}</span>
              </div>
              {image.width && image.height && (
                <div className="flex justify-between">
                  <span className="text-gray-500">크기</span>
                  <span>{image.width} x {image.height} px</span>
                </div>
              )}
              {image.file_size && (
                <div className="flex justify-between">
                  <span className="text-gray-500">용량</span>
                  <span>{(image.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>

            {image.status !== 'processing' && (
              <button
                onClick={() => taggingMutation.mutate()}
                disabled={taggingMutation.isPending}
                className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <TagIcon className="w-4 h-4 inline mr-2" />
                {taggingMutation.isPending ? '처리 중...' : image.status === 'tagged' ? '다시 태깅' : '태깅 시작'}
              </button>
            )}

            <a
              href={`/api/images/${imageId}/file`}
              download={image.filename}
              className="w-full mt-2 py-2 px-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              다운로드
            </a>
          </div>

          {/* Tags Section */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              태그
            </h3>

            {image.tags && image.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className={`group inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                      tag.confidence === 1.0
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}
                    title={tag.confidence === 1.0 ? '사용자 정의 태그' : 'AI 생성 태그'}
                  >
                    {tag.confidence === 1.0 && <span className="mr-0.5">#</span>}
                    {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                      title="태그 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">태그가 없습니다.</p>
            )}

            {/* Add Tags */}
            <div className="pt-3 mt-3 border-t">
              {isEditingTags ? (
                <div className="space-y-2">
                  <textarea
                    value={userTagsInput}
                    onChange={(e) => setUserTagsInput(e.target.value)}
                    placeholder="#태그1 #태그2 형식으로 입력"
                    rows={2}
                    className="w-full px-2 py-1 text-sm border rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveTags}
                      disabled={updateMutation.isPending}
                      className="flex-1 py-1 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                      {updateMutation.isPending ? '저장 중...' : '추가'}
                    </button>
                    <button
                      onClick={handleCancelEditTags}
                      className="py-1 px-2 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleStartEditTags}
                  className="w-full py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  + 태그 추가
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
