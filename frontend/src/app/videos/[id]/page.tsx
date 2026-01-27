'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import { ArrowLeft, Tag as TagIcon, Trash2, Edit2, Save, X, Download } from 'lucide-react';
import Link from 'next/link';
import { getVideo, getScenes, startTagging, deleteVideo, updateVideo, updateScene, deleteSceneTag } from '@/lib/api';
import VideoPlayer, { VideoPlayerRef } from '@/components/VideoPlayer';
import SceneTimeline from '@/components/SceneTimeline';
import ProcessingStatus from '@/components/ProcessingStatus';
import { useTaggingStatus } from '@/hooks/useTaggingStatus';

interface SceneTag {
  id: string;
  name: string;
  confidence: number | null;
}

interface SceneWithTags {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  thumbnail_path: string | null;
  clip_path: string | null;
  user_notes: string | null;
  created_at: string | null;
  tags: SceneTag[];
}

function VideoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const videoId = params.id as string;
  const sceneIdFromUrl = searchParams.get('scene');

  const playerRef = useRef<VideoPlayerRef>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null); // 편집 중인 장면 ID 저장
  const [userTagsInput, setUserTagsInput] = useState('');

  const { data: video, isLoading: videoLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => getVideo(videoId),
  });

  const { data: scenes, refetch: refetchScenes } = useQuery({
    queryKey: ['scenes', videoId],
    queryFn: () => getScenes(videoId),
    enabled: !!video,
  });

  // Real-time status polling
  const { data: statusData } = useTaggingStatus(
    videoId,
    video?.status === 'processing'
  );

  // Refresh data when processing completes
  useEffect(() => {
    if (statusData?.status === 'tagged' && video?.status === 'processing') {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] }); // 목록도 갱신
      refetchScenes();
    }
  }, [statusData?.status, video?.status, queryClient, videoId, refetchScenes]);

  const taggingMutation = useMutation({
    mutationFn: () => startTagging(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(videoId),
    onSuccess: () => {
      router.push('/videos');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; summary?: string }) => updateVideo(videoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      setIsEditing(false);
      setIsEditingSummary(false);
    },
  });

  const sceneUpdateMutation = useMutation({
    mutationFn: ({ sceneId, data }: { sceneId: string; data: { user_notes?: string } }) =>
      updateScene(sceneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', videoId] });
      setIsEditingTags(false);
      setEditingSceneId(null);
      setUserTagsInput('');
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: ({ sceneId, tagId }: { sceneId: string; tagId: string }) =>
      deleteSceneTag(sceneId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes', videoId] });
    },
  });

  const handleDeleteTag = (sceneId: string, tagId: string) => {
    if (confirm('이 태그를 삭제하시겠습니까?')) {
      deleteTagMutation.mutate({ sceneId, tagId });
    }
  };

  const handleStartEdit = () => {
    setEditTitle(video?.title || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle || undefined,
    });
  };

  const handleStartEditSummary = () => {
    setEditSummary(video?.summary || '');
    setIsEditingSummary(true);
  };

  const handleSaveSummary = () => {
    updateMutation.mutate({
      summary: editSummary || undefined,
    });
  };

  const handleCancelEditSummary = () => {
    setEditSummary(video?.summary || '');
    setIsEditingSummary(false);
  };

  const handleStartEditSceneTags = () => {
    if (selectedScene && selectedSceneId) {
      setEditingSceneId(selectedSceneId); // 편집 시작 시 현재 선택된 장면 ID 저장
      setUserTagsInput(selectedScene.user_notes || '');
      setIsEditingTags(true);
    }
  };

  const handleSaveSceneTags = () => {
    if (editingSceneId) { // 저장된 편집 중인 장면 ID 사용
      sceneUpdateMutation.mutate({
        sceneId: editingSceneId,
        data: { user_notes: userTagsInput || undefined },
      });
    }
  };

  const handleCancelEditSceneTags = () => {
    setUserTagsInput('');
    setIsEditingTags(false);
    setEditingSceneId(null);
  };

  // Ref to track if user explicitly selected a scene (prevents auto-update until cleared)
  const userExplicitSelectionRef = useRef(false);
  // Ref to track if initial scene selection from URL has been done
  const initialSceneSelectionDoneRef = useRef(false);

  // Handle scene selection from URL query parameter
  useEffect(() => {
    if (sceneIdFromUrl && scenes?.scenes && !initialSceneSelectionDoneRef.current) {
      const targetScene = (scenes.scenes as SceneWithTags[]).find(s => s.id === sceneIdFromUrl);
      if (targetScene) {
        initialSceneSelectionDoneRef.current = true;
        userExplicitSelectionRef.current = true;
        setSelectedSceneId(targetScene.id);
        // Seek to the scene's start time after a small delay to ensure player is ready
        setTimeout(() => {
          playerRef.current?.seekTo(targetScene.start_time);
        }, 100);
      }
    }
  }, [sceneIdFromUrl, scenes?.scenes]);

  const handleSceneClick = useCallback((scene: { id?: string; start_time: number }) => {
    playerRef.current?.seekTo(scene.start_time);
    if (scene.id) {
      userExplicitSelectionRef.current = true; // User explicitly selected this scene
      setSelectedSceneId(scene.id);
    }
  }, []);

  // Clear explicit selection when user clicks "전체 보기"
  const handleClearSceneSelection = useCallback(() => {
    userExplicitSelectionRef.current = false;
    setSelectedSceneId(null);
  }, []);

  // Find current scene based on playback time
  const currentScene = useMemo((): SceneWithTags | null => {
    if (!scenes?.scenes) return null;
    return (scenes.scenes as SceneWithTags[]).find(
      (scene) => currentTime >= scene.start_time && currentTime < scene.end_time
    ) || null;
  }, [scenes?.scenes, currentTime]);

  // Update selected scene based on current playback time (only when user hasn't explicitly selected)
  useEffect(() => {
    // Don't auto-update if user explicitly selected a scene
    if (userExplicitSelectionRef.current) {
      return;
    }

    // Don't auto-update while editing tags
    if (isEditingTags) {
      return;
    }

    // Auto-update selection based on playback position
    if (currentScene && currentScene.id !== selectedSceneId) {
      setSelectedSceneId(currentScene.id);
    }
  }, [currentScene, selectedSceneId, isEditingTags]);

  // Get the selected scene object
  const selectedScene = selectedSceneId
    ? (scenes?.scenes as SceneWithTags[] | undefined)?.find((s) => s.id === selectedSceneId)
    : null;

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  }, []);

  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const videoStreamUrl = `/api/videos/${videoId}/stream`;

  if (videoLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">동영상을 찾을 수 없습니다.</p>
        <Link href="/videos" className="text-blue-600 hover:underline">
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
              className="w-full px-2 py-1 border rounded"
            />
          ) : (
            video.title || video.filename
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
          <VideoPlayer
            ref={playerRef}
            url={videoStreamUrl}
            onProgress={handleProgress}
            onDuration={handleDuration}
          />

          {scenes && scenes.scenes && scenes.scenes.length > 0 && (
            <SceneTimeline
              scenes={scenes.scenes}
              duration={duration}
              currentTime={currentTime}
              selectedSceneId={selectedSceneId}
              onSceneClick={handleSceneClick}
            />
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">AI 요약</h3>
              {!isEditingSummary && (
                <button
                  onClick={handleStartEditSummary}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  편집
                </button>
              )}
            </div>
            {isEditingSummary ? (
              <div className="space-y-2">
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="동영상 요약을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSummary}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelEditSummary}
                    className="py-2 px-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleStartEditSummary}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
              >
                {video.summary ? (
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{video.summary}</p>
                ) : (
                  <p className="text-gray-400 text-sm">클릭하여 요약을 추가하세요</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3">상태</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">상태</span>
                <ProcessingStatus status={video.status as 'uploaded' | 'processing' | 'tagged' | 'error'} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">파일명</span>
                <span className="truncate ml-2">{video.filename}</span>
              </div>
              {video.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">길이</span>
                  <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>

            {video.status !== 'processing' && (
              <button
                onClick={() => taggingMutation.mutate()}
                disabled={taggingMutation.isPending}
                className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <TagIcon className="w-4 h-4 inline mr-2" />
                {taggingMutation.isPending ? '처리 중...' : video.status === 'tagged' ? '다시 태깅' : '태깅 시작'}
              </button>
            )}
          </div>

          {/* Tags Section */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              {selectedScene ? `장면 태그` : '동영상 태그'}
              {selectedScene && (
                <button
                  onClick={handleClearSceneSelection}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  전체 보기
                </button>
              )}
            </h3>

            {selectedScene ? (
              // Scene-specific tags
              <div className="space-y-3">
                <div className="text-xs text-gray-500">
                  장면 {((scenes?.scenes as SceneWithTags[])?.findIndex((s) => s.id === selectedScene.id) ?? 0) + 1}
                  ({selectedScene.start_time.toFixed(1)}s - {selectedScene.end_time.toFixed(1)}s)
                </div>

                {/* Scene Tags */}
                {selectedScene.tags && selectedScene.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScene.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`group inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          tag.confidence === 1.0
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}
                        title={tag.confidence === 1.0 ? '사용자 정의 태그' : 'AI 생성 태그'}
                      >
                        {tag.confidence === 1.0 && <span className="mr-0.5">#</span>}
                        {tag.name}
                        <button
                          onClick={() => handleDeleteTag(selectedScene.id, tag.id)}
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
                <div className="pt-2 border-t">
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
                          onClick={handleSaveSceneTags}
                          disabled={sceneUpdateMutation.isPending}
                          className="flex-1 py-1 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {sceneUpdateMutation.isPending ? '저장 중...' : '추가'}
                        </button>
                        <button
                          onClick={handleCancelEditSceneTags}
                          className="py-1 px-2 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartEditSceneTags}
                      className="w-full py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      + 태그 추가
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Video-level tags
              <div>
                {video.tags && video.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`px-2 py-1 text-xs rounded-full ${
                          tag.confidence === 1.0
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                        title={tag.confidence === 1.0 ? '사용자 정의 태그' : tag.confidence ? `AI 태그 (신뢰도: ${(tag.confidence * 100).toFixed(0)}%)` : 'AI 태그'}
                      >
                        {tag.confidence === 1.0 && <span className="mr-0.5">#</span>}
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">장면을 선택하면 태그를 확인할 수 있습니다.</p>
                )}
              </div>
            )}
          </div>

          {scenes && scenes.scenes && scenes.scenes.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-3">장면 ({scenes.scenes.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(scenes.scenes as SceneWithTags[]).map((scene, index: number) => (
                  <div
                    key={scene.id}
                    className={`p-2 rounded text-sm flex items-center justify-between group transition-colors ${
                      selectedSceneId === scene.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <button
                      onClick={() => handleSceneClick(scene)}
                      className="flex-1 text-left hover:text-blue-600 transition-colors"
                    >
                      <span className="font-medium">장면 {index + 1}</span>
                      <span className="text-gray-500 ml-2">
                        {scene.start_time.toFixed(1)}s - {scene.end_time.toFixed(1)}s
                      </span>
                      {scene.tags && scene.tags.length > 0 && (
                        <span className="text-gray-400 ml-1 text-xs">
                          ({scene.tags.length} 태그)
                        </span>
                      )}
                    </button>
                    <a
                      href={`/api/scenes/${scene.id}/download`}
                      download
                      className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="장면 다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <VideoDetailContent />
    </Suspense>
  );
}
