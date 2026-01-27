'use client';

import { useMemo } from 'react';

interface Scene {
  id: string;
  start_time: number;
  end_time: number;
}

interface SceneTimelineProps {
  scenes: Scene[];
  duration: number;
  currentTime: number;
  selectedSceneId?: string | null;
  onSceneClick: (scene: Scene) => void;
}

// Generate distinct colors for scenes
const sceneColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-yellow-500',
  'bg-red-500',
];

export default function SceneTimeline({
  scenes,
  duration,
  currentTime,
  selectedSceneId,
  onSceneClick,
}: SceneTimelineProps) {
  const currentPosition = useMemo(() => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Use selectedSceneId if available, otherwise fall back to currentTime-based detection
  const currentScene = useMemo(() => {
    // If a scene is explicitly selected, use that
    if (selectedSceneId) {
      const selected = scenes.find((scene) => scene.id === selectedSceneId);
      if (selected) return selected;
    }
    // Fall back to currentTime-based detection
    return scenes.find(
      (scene) => currentTime >= scene.start_time && currentTime < scene.end_time
    );
  }, [scenes, currentTime, selectedSceneId]);

  if (scenes.length === 0 || duration === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>장면 타임라인</span>
        {currentScene && (
          <span className="text-blue-600">
            현재: 장면 {scenes.findIndex((s) => s.id === currentScene.id) + 1}
          </span>
        )}
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Scene segments */}
        {scenes.map((scene, index) => {
          const left = (scene.start_time / duration) * 100;
          const width = ((scene.end_time - scene.start_time) / duration) * 100;
          const colorClass = sceneColors[index % sceneColors.length];
          const isCurrentScene = currentScene?.id === scene.id;

          return (
            <button
              key={scene.id}
              onClick={() => onSceneClick(scene)}
              className={`absolute top-0 h-full ${colorClass} hover:brightness-110 transition-all cursor-pointer ${
                isCurrentScene ? 'ring-2 ring-white ring-offset-1' : ''
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`장면 ${index + 1}: ${scene.start_time.toFixed(1)}s - ${scene.end_time.toFixed(1)}s`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-80">
                {index + 1}
              </span>
            </button>
          );
        })}

        {/* Current position indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none"
          style={{ left: `${currentPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Scene list */}
      <div className="flex flex-wrap gap-2 mt-2">
        {scenes.map((scene, index) => {
          const colorClass = sceneColors[index % sceneColors.length];
          const isCurrentScene = currentScene?.id === scene.id;

          return (
            <button
              key={scene.id}
              onClick={() => onSceneClick(scene)}
              className={`px-2 py-1 rounded text-xs text-white ${colorClass} hover:brightness-110 transition-all ${
                isCurrentScene ? 'ring-2 ring-offset-1 ring-gray-400' : ''
              }`}
            >
              장면 {index + 1} ({scene.start_time.toFixed(1)}s)
            </button>
          );
        })}
      </div>
    </div>
  );
}
