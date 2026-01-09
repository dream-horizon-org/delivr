/**
 * useReleases Hook
 * Fetches and caches releases data using React Query
 * Similar to useReleaseConfigs pattern
 * 
 * IMPORTANT: Syncs loader data with React Query cache on every navigation
 * - initialData only works on first mount
 * - useEffect syncs loader data → cache on subsequent navigations
 * - This ensures loader data is always used, even when React Query has cache
 */

import { useQuery, useQueryClient } from 'react-query';
import { useEffect, useMemo } from 'react';
import { apiGet } from '~/utils/api-client';
import { extractApiErrorMessage } from '~/utils/api-error-utils';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { getReleaseActiveStatus } from '~/utils/release-utils';
import { RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';

interface ReleasesResponse {
  success: boolean;
  releases?: BackendReleaseResponse[];
  error?: string;
}

const QUERY_KEY = (tenantId: string) => ['releases', tenantId];

export function useReleases(
  tenantId?: string,
  options?: {
    includeTasks?: boolean;
    initialData?: ReleasesResponse;
  }
) {
  const queryClient = useQueryClient();

  // Check if we should force a refetch (e.g., after creating a release)
  // Look for 'refresh' query parameter in URL
  const shouldForceRefetch = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).has('refresh');
  
  // If refresh param is present, invalidate immediately to force refetch
  useEffect(() => {
    if (shouldForceRefetch && tenantId) {
      console.log('[useReleases] Refresh parameter detected, invalidating cache...');
      queryClient.invalidateQueries(QUERY_KEY(tenantId));
    }
  }, [shouldForceRefetch, tenantId, queryClient]);

  // Sync loader data with React Query cache only if cache is empty
  // If cache exists, refetchOnMount will handle updates
  // This prevents overwriting optimistic updates or fresh API data with stale loader data
  useEffect(() => {
    if (options?.initialData && tenantId && !shouldForceRefetch) {
      const queryKey = QUERY_KEY(tenantId);
      const existingData = queryClient.getQueryData<ReleasesResponse>(queryKey);
      
      // Only sync if cache is empty (first load)
      if (!existingData || !existingData.releases || existingData.releases.length === 0) {
        queryClient.setQueryData<ReleasesResponse>(queryKey, options.initialData);
      }
    }
  }, [options?.initialData, tenantId, queryClient, shouldForceRefetch]);

  // Fetch all releases for tenant
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ReleasesResponse, Error>(
    QUERY_KEY(tenantId || ''),
    async () => {
      if (!tenantId) {
        return { success: false, releases: [] };
      }
      
      const includeTasks = options?.includeTasks ? '?includeTasks=true' : '';
      const result = await apiGet<{ success: boolean; releases?: BackendReleaseResponse[]; error?: string }>(
        `/api/v1/tenants/${tenantId}/releases${includeTasks}`
      );
      console.log('[useReleases] API GET:', `/api/v1/tenants/${tenantId}/releases${includeTasks}`);
      console.log('[useReleases] Result:', result);
      
      return {
        success: result.success,
        releases: result.data?.releases || [],
        error: result.error ? extractApiErrorMessage(result.error) : undefined,
      };
    },
    {
      enabled: !!tenantId, // Only fetch if tenantId exists
      initialData: shouldForceRefetch ? undefined : options?.initialData, // Skip initialData if forcing refetch
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh (releases change more frequently than configs)
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache time
      refetchOnWindowFocus: true, // Refetch when user returns to tab (background refetch)
      refetchOnMount: true, // Always refetch on mount to catch status changes (upcoming → active → completed)
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: 1, // Retry once on failure
      // Background refetching: refetch in background when data becomes stale
      // This ensures data is fresh without blocking UI
      refetchInterval: false, // Don't auto-refetch on interval (releases are user-triggered)
    }
  );

  // Invalidate cache (call after create/update/delete)
  const invalidateCache = () => {
    if (tenantId) {
      console.log('[useReleases] Invalidating cache for tenant:', tenantId);
      queryClient.invalidateQueries(QUERY_KEY(tenantId));
    }
  };

  // Optimistically update a single release
  const updateReleaseInCache = (releaseId: string, updater: (release: BackendReleaseResponse) => BackendReleaseResponse) => {
    if (!tenantId) return;
    
    queryClient.setQueryData<ReleasesResponse>(
      QUERY_KEY(tenantId),
      (old: ReleasesResponse | undefined): ReleasesResponse => {
        if (!old || !old.releases) return { success: false, releases: [] };
        
        return {
          ...old,
          releases: old.releases.map(release =>
            release.id === releaseId ? updater(release) : release
          ),
        };
      }
    );
  };

  // Add a release to cache optimistically (after creation)
  const addReleaseToCache = (release: BackendReleaseResponse) => {
    if (!tenantId) return;
    
    queryClient.setQueryData<ReleasesResponse>(
      QUERY_KEY(tenantId),
      (old: ReleasesResponse | undefined): ReleasesResponse => {
        if (!old || !old.releases) {
          return { success: true, releases: [release] };
        }
        
        return {
          ...old,
          releases: [release, ...old.releases],
        };
      }
    );
  };

  // Remove a release from cache optimistically
  const removeReleaseFromCache = (releaseId: string) => {
    if (!tenantId) return;
    
    queryClient.setQueryData<ReleasesResponse>(
      QUERY_KEY(tenantId),
      (old: ReleasesResponse | undefined): ReleasesResponse => {
        if (!old || !old.releases) return { success: false, releases: [] };
        
        return {
          ...old,
          releases: old.releases.filter(release => release.id !== releaseId),
        };
      }
    );
  };

  // Selectors - categorize releases by UI active status
  const releases = data?.releases || [];
  
  // Categorize releases by UI active status (calculated at runtime)
  // Active tab includes both RUNNING and PAUSED releases
  // Archived releases are separated into their own tab
  const { upcoming, active, completed, archived } = useMemo(() => {
    const upcoming: BackendReleaseResponse[] = [];
    const active: BackendReleaseResponse[] = [];
    const completed: BackendReleaseResponse[] = [];
    const archived: BackendReleaseResponse[] = [];
    
    console.log('[useReleases] Categorizing releases by UI active status:', releases);

    releases.forEach((release) => {
      const activeStatus = getReleaseActiveStatus(release);
      
      switch (activeStatus) {
        case RELEASE_ACTIVE_STATUS.UPCOMING:
            upcoming.push(release);
          break;
        case RELEASE_ACTIVE_STATUS.RUNNING:
        case RELEASE_ACTIVE_STATUS.PAUSED:
          // Both RUNNING and PAUSED go into active tab
          active.push(release);
          break;
        case RELEASE_ACTIVE_STATUS.COMPLETED:
          completed.push(release);
          break;
        case RELEASE_ACTIVE_STATUS.ARCHIVED:
          archived.push(release);
          break;
      }
    });

    return { upcoming, active, completed, archived };
  }, [releases]);

  return {
    // Data
    releases,
    // Categorized by UI active status (calculated at runtime)
    // Active includes both RUNNING and PAUSED releases
    // Archived releases are separated into their own tab
    upcoming,
    active,
    completed,
    archived,
    
    // Loading & Error
    isLoading,
    error: error as Error | null,
    
    // Actions
    refetch,
    invalidateCache,
    updateReleaseInCache,
    addReleaseToCache,
    removeReleaseFromCache,
  };
}

