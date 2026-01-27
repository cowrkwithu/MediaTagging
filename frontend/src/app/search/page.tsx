'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, Video, Film, Tag, X, Image } from 'lucide-react';
import Link from 'next/link';
import { search, getTags } from '@/lib/api';
import type { SearchQuery, SearchResult } from '@/types';

export default function SearchPage() {
  const [andTags, setAndTags] = useState<string[]>([]);
  const [orTags, setOrTags] = useState<string[]>([]);
  const [notTags, setNotTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeInput, setActiveInput] = useState<'and' | 'or' | 'not'>('and');

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  const searchMutation = useMutation({
    mutationFn: (query: SearchQuery) => search(query),
  });

  const handleAddTag = (tag: string, type: 'and' | 'or' | 'not') => {
    const setters = { and: setAndTags, or: setOrTags, not: setNotTags };
    const current = { and: andTags, or: orTags, not: notTags };

    if (!current[type].includes(tag)) {
      setters[type]([...current[type], tag]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tag: string, type: 'and' | 'or' | 'not') => {
    const setters = { and: setAndTags, or: setOrTags, not: setNotTags };
    const current = { and: andTags, or: orTags, not: notTags };

    setters[type](current[type].filter((t) => t !== tag));
  };

  // Parse search expression like "태그1 AND 태그2 OR 태그3 NOT 태그4"
  const parseSearchExpression = (expression: string): { and: string[], or: string[], not: string[] } => {
    const result = { and: [] as string[], or: [] as string[], not: [] as string[] };

    if (!expression.trim()) return result;

    // Check if expression contains operators
    const hasOperators = /\b(AND|OR|NOT)\b|[&|!-]/i.test(expression);

    if (!hasOperators) {
      // No operators - treat as single tag based on active input mode
      return result;
    }

    // Normalize operators
    let normalized = expression
      .replace(/\s+&\s+/g, ' AND ')
      .replace(/\s+\|\s+/g, ' OR ')
      .replace(/\s*!\s*/g, ' NOT ')
      .replace(/\s+-\s*/g, ' NOT ');

    // Split by OR first (lowest precedence)
    const orParts = normalized.split(/\s+OR\s+/i);

    for (const orPart of orParts) {
      // Check for NOT
      const notMatch = orPart.match(/NOT\s+(.+)/i);
      if (notMatch) {
        const notTags = notMatch[1].split(/\s+AND\s+/i).map(t => t.trim()).filter(t => t);
        result.not.push(...notTags);
        continue;
      }

      // Check for AND
      if (/\s+AND\s+/i.test(orPart)) {
        const andParts = orPart.split(/\s+AND\s+/i).map(t => t.trim()).filter(t => t);
        result.and.push(...andParts);
      } else {
        // Single tag in OR context
        const tag = orPart.trim();
        if (tag && !tag.match(/^(AND|OR|NOT)$/i)) {
          if (orParts.length > 1) {
            result.or.push(tag);
          } else {
            result.and.push(tag);
          }
        }
      }
    }

    // Remove duplicates
    result.and = [...new Set(result.and)];
    result.or = [...new Set(result.or)];
    result.not = [...new Set(result.not)];

    return result;
  };

  const handleSearch = () => {
    let finalAndTags = [...andTags];
    let finalOrTags = [...orTags];
    let finalNotTags = [...notTags];

    if (inputValue.trim()) {
      const trimmedInput = inputValue.trim();

      // Check if input contains search operators
      const hasOperators = /\b(AND|OR|NOT)\b|[&|!-]/i.test(trimmedInput);

      if (hasOperators) {
        // Parse as search expression
        const parsed = parseSearchExpression(trimmedInput);
        finalAndTags = [...new Set([...finalAndTags, ...parsed.and])];
        finalOrTags = [...new Set([...finalOrTags, ...parsed.or])];
        finalNotTags = [...new Set([...finalNotTags, ...parsed.not])];

        // Update state to show parsed tags
        setAndTags(finalAndTags);
        setOrTags(finalOrTags);
        setNotTags(finalNotTags);
      } else {
        // Treat as single tag based on active mode
        if (activeInput === 'and' && !finalAndTags.includes(trimmedInput)) {
          finalAndTags.push(trimmedInput);
          setAndTags(finalAndTags);
        } else if (activeInput === 'or' && !finalOrTags.includes(trimmedInput)) {
          finalOrTags.push(trimmedInput);
          setOrTags(finalOrTags);
        } else if (activeInput === 'not' && !finalNotTags.includes(trimmedInput)) {
          finalNotTags.push(trimmedInput);
          setNotTags(finalNotTags);
        }
      }
      setInputValue('');
    }

    const query: SearchQuery = {
      target: ['videos', 'scenes', 'images'],
      page: 1,
      limit: 20,
    };

    if (finalAndTags.length > 0) query.and_tags = finalAndTags;
    if (finalOrTags.length > 0) query.or_tags = finalOrTags;
    if (finalNotTags.length > 0) query.not_tags = finalNotTags;

    searchMutation.mutate(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (inputValue.trim()) {
        handleAddTag(inputValue.trim(), activeInput);
      }
      // Also trigger search on Enter
      handleSearch();
    }
  };

  // Check if a tag exists in the database
  const isTagInDatabase = (tagName: string) => {
    return allTags?.some(tag => tag.name === tagName) ?? false;
  };

  // Get tags that don't exist in database
  const getNonExistentTags = () => {
    // Only check tags that are already added to the lists, not the current input
    const allSearchTags = [...andTags, ...orTags, ...notTags];

    // Filter out empty strings and operator keywords
    const validTags = allSearchTags.filter(tag => {
      const trimmed = tag.trim();
      return trimmed &&
             trimmed.length > 0 &&
             !['AND', 'OR', 'NOT', '&', '|', '-', '!'].includes(trimmed.toUpperCase());
    });

    return validTags.filter(tag => !isTagInDatabase(tag));
  };

  const nonExistentTags = getNonExistentTags();
  const hasSearchInput = andTags.length > 0 || orTags.length > 0 || inputValue.trim().length > 0;

  const TagList = ({ tags, type, color }: { tags: string[]; type: 'and' | 'or' | 'not'; color: string }) => (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${color}`}
        >
          {tag}
          <button onClick={() => handleRemoveTag(tag, type)} className="hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">태그 검색</h1>

      <div className="p-6 border rounded-lg space-y-4">
        <div className="flex gap-2">
          {(['and', 'or', 'not'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActiveInput(type)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeInput === type
                  ? type === 'and' ? 'bg-blue-600 text-white'
                  : type === 'or' ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              {type === 'and' ? 'AND (모두 포함)' : type === 'or' ? 'OR (하나 이상)' : 'NOT (제외)'}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleKeyPress(e)}
            placeholder="태그 또는 검색식 입력 (예: 태그1 AND 태그2 OR 태그3 NOT 태그4)"
            className="w-full px-4 py-2 border rounded-lg pr-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <p className="text-xs text-gray-500">
          검색식: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">AND</code> 또는 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&</code> (모두 포함),
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">OR</code> 또는 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">|</code> (하나 이상),
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">NOT</code> 또는 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">-</code> (제외)
        </p>

        {allTags && allTags.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">사용 가능한 태그 ({allTags.length}개)</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.name, activeInput)}
                  className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {tag.name}
                  <span className="ml-1 text-xs text-gray-400">({(tag.video_count || 0) + (tag.image_count || 0)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {andTags.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 mr-2">AND:</span>
              <TagList tags={andTags} type="and" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          {orTags.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 mr-2">OR:</span>
              <TagList tags={orTags} type="or" color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
            </div>
          )}
          {notTags.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 mr-2">NOT:</span>
              <TagList tags={notTags} type="not" color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>

        {nonExistentTags.length > 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              다음 태그는 데이터베이스에 존재하지 않습니다: {' '}
              <span className="font-medium">{nonExistentTags.join(', ')}</span>
            </p>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={!hasSearchInput}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4 inline mr-2" />
          검색
        </button>
      </div>

      {searchMutation.isPending && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {searchMutation.data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              검색 결과 (동영상 {searchMutation.data.total_videos}건, 사진 {searchMutation.data.total_images}건, 장면 {searchMutation.data.total_scenes}건)
            </h2>
            <button
              onClick={() => {
                searchMutation.reset();
                setAndTags([]);
                setOrTags([]);
                setNotTags([]);
                setInputValue('');
              }}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              결과 삭제
            </button>
          </div>

          {searchMutation.data.videos.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                동영상 ({searchMutation.data.videos.length})
              </h3>
              <div className="space-y-2">
                {searchMutation.data.videos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="font-medium">{video.title || video.filename}</div>
                    {video.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                          {tag}
                        </span>
                      ))}
                      {video.tags.length > 5 && (
                        <span className="text-xs text-gray-500">+{video.tags.length - 5}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchMutation.data.images && searchMutation.data.images.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                사진 ({searchMutation.data.images.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {searchMutation.data.images.map((image) => (
                  <Link
                    key={image.id}
                    href={`/images/${image.id}`}
                    className="block border rounded-lg hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800">
                      {image.thumbnail_path ? (
                        <img
                          src={`/api/images/${image.id}/thumbnail`}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="font-medium text-sm truncate">{image.title || image.filename}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {image.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                            {tag}
                          </span>
                        ))}
                        {image.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{image.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchMutation.data.scenes.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Film className="w-4 h-4" />
                장면 ({searchMutation.data.scenes.length})
              </h3>
              <div className="space-y-2">
                {searchMutation.data.scenes.map((scene) => (
                  <Link
                    key={scene.id}
                    href={`/videos/${scene.video_id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{scene.video_filename}</span>
                      <span className="text-sm text-gray-500">
                        {scene.start_time.toFixed(1)}s - {scene.end_time.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scene.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchMutation.data.total_videos === 0 && searchMutation.data.total_scenes === 0 && searchMutation.data.total_images === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
