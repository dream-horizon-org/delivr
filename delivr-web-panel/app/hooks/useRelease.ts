/**
 * useRelease Hook
 * Fetches and caches a single release by ID using React Query
 * Similar to useReleases pattern
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { shouldRetryOnError } from '~/utils/react-query-retry';

interface ReleaseResponse {
  success: boolean;
  release?: BackendReleaseResponse;
  error?: string;
}

const QUERY_KEY = (appId: string, releaseId: string) => ['release', appId, releaseId];

export function useRelease(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  // Fetch single release by ID
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ReleaseResponse, Error>(
    QUERY_KEY(appId || '', releaseId || ''),
    async () => {
      if (!appId || !releaseId) {
        return { success: false };
      }
      
      const result = await apiGet<{ release?: BackendReleaseResponse }>(
        `/api/v1/apps/${appId}/releases/${releaseId}`
      );
      // console.log('[useRelease] API GET:', `/api/v1/apps/${appId}/releases/${releaseId}`);
      // console.log('[useRelease] Result:', result);
      
      return {
        success: result.success,
        release: result.data?.release,
        error: result.error,
      };
    },
    {
      enabled: !!appId && !!releaseId, // Only fetch if both IDs exist
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache time
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnMount: true, // Always refetch on mount to catch status changes
      retry: shouldRetryOnError, // Don't retry auth errors to prevent cascading failures
    }
  );

  // Invalidate cache (call after update/delete)
  const invalidateCache = useCallback(() => {
    if (appId && releaseId) {
      console.log('[useRelease] Invalidating cache for release:', { appId, releaseId });
      queryClient.invalidateQueries(QUERY_KEY(appId, releaseId));
    }
  }, [appId, releaseId, queryClient]);

  // Optimistically update the release in cache
  const updateReleaseInCache = useCallback(
    (updater: (release: BackendReleaseResponse) => BackendReleaseResponse) => {
    if (!appId || !releaseId) return;
    
    queryClient.setQueryData<ReleaseResponse>(
      QUERY_KEY(appId, releaseId),
      (old: ReleaseResponse | undefined): ReleaseResponse => {
        if (!old || !old.release) return { success: false };
        
        return {
          ...old,
          release: updater(old.release),
        };
      }
    );
    },
    [appId, releaseId, queryClient]
  );

  return {
    // Data
    release: data?.release,
    
    // Loading & Error
    isLoading,
    error: error as Error | null,
    
    // Actions
    refetch,
    invalidateCache,
    updateReleaseInCache,
  };
}

