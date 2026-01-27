'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Tag as TagIcon, Trash2, Edit2, Save, X, Download } from 'lucide-react';
import Link from 'next/link';
import { getVideo, getScenes, startTagging, deleteVideo, updateVideo } from '@/lib/api';
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
  created_at: string | null;
  tags: SceneTag[];
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const videoId = params.id as string;

  const playerRef = useRef<VideoPlayerRef>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
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
    mutationFn: (data: { title?: string; user_notes?: string }) => updateVideo(videoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      setIsEditing(false);
    },
  });

  const handleStartEdit = () => {
    setEditTitle(video?.title || '');
    setEditNotes(video?.user_notes || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle || undefined,
      user_notes: editNotes || undefined,
    });
  };

  const handleStartEditTags = () => {
    setUserTagsInput(video?.user_notes || '');
    setIsEditingTags(true);
  };

  const handleSaveTags = () => {
    updateMutation.mutate({
      user_notes: userTagsInput || undefined,
    }, {
      onSuccess: () => {
        setIsEditingTags(false);
        // Refresh video and scenes to show updated tags
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        queryClient.invalidateQueries({ queryKey: ['scenes', videoId] });
      }
    });
  };

  const handleCancelEditTags = () => {
    setUserTagsInput(video?.user_notes || '');
    setIsEditingTags(false);
  };

  const handleSceneClick = useCallback((scene: { id?: string; start_time: number }) => {
    playerRef.current?.seekTo(scene.start_time);
    if (scene.id) {
      setSelectedSceneId(scene.id);
    }
  }, []);

  // Find current scene based on playback time
  const getCurrentScene = useCallback((): SceneWithTags | null => {
    if (!scenes?.scenes) return null;
    return (scenes.scenes as SceneWithTags[]).find(
      (scene) => currentTime >= scene.start_time && currentTime < scene.end_time
    ) || null;
  }, [scenes?.scenes, currentTime]);

  // Update selected scene based on current playback time
  useEffect(() => {
    const currentScene = getCurrentScene();
    if (currentScene && currentScene.id !== selectedSceneId) {
      setSelectedSceneId(currentScene.id);
    }
  }, [getCurrentScene, selectedSceneId]);

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
        <Link href="/videos" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
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
              onSceneClick={handleSceneClick}
            />
          )}

          {video.summary && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">AI 요약</h3>
              <p className="text-gray-600 dark:text-gray-400">{video.summary}</p>
            </div>
          )}

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">사용자 정의 태그</h3>
              {!isEditingTags && (
                <button
                  onClick={handleStartEditTags}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  편집
                </button>
              )}
            </div>
            {isEditingTags ? (
              <div className="space-y-3">
                <textarea
                  value={userTagsInput}
                  onChange={(e) => setUserTagsInput(e.target.value)}
                  placeholder="#태그1 #태그2 형식으로 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  #단어 형식으로 입력하면 태그로 추가됩니다
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTags}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelEditTags}
                    className="py-2 px-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleStartEditTags}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2 transition-colors"
              >
                {video.user_notes ? (
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {video.user_notes}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">클릭하여 태그를 추가하세요</p>
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
                  onClick={() => setSelectedSceneId(null)}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  전체 보기
                </button>
              )}
            </h3>

            {selectedScene ? (
              // Scene-specific tags
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  장면 {((scenes?.scenes as SceneWithTags[])?.findIndex((s) => s.id === selectedScene.id) ?? 0) + 1}
                  ({selectedScene.start_time.toFixed(1)}s - {selectedScene.end_time.toFixed(1)}s)
                </div>
                {selectedScene.tags && selectedScene.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScene.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`px-2 py-1 text-xs rounded-full ${
                          tag.confidence === 1.0
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}
                        title={tag.confidence === 1.0 ? '사용자 정의 태그' : 'AI 생성 태그'}
                      >
                        {tag.confidence === 1.0 && <span className="mr-0.5">#</span>}
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">태그가 없습니다.</p>
                )}
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
                  <p className="text-sm text-gray-500">태그가 없습니다.</p>
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
