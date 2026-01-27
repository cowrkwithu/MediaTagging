'use client';

import { useQuery } from '@tanstack/react-query';
import { getTaggingStatus } from '@/lib/api';

export function useTaggingStatus(videoId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tagging-status', videoId],
    queryFn: () => getTaggingStatus(videoId),
    enabled: enabled && !!videoId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while processing
      const status = query.state.data?.status;
      return status === 'processing' ? 2000 : false;
    },
    staleTime: 1000,
  });
}
