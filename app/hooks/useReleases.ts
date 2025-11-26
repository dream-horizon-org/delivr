/**
 * useReleases Hook
 * Fetches and caches releases data using React Query
 * Similar to useReleaseConfigs pattern
 */

import { useQuery, useQueryClient } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement/release-retrieval.service';

interface ReleasesResponse {
  success: boolean;
  releases?: BackendReleaseResponse[];
  error?: string;
}

const QUERY_KEY = (tenantId: string) => ['releases', tenantId];

export function useReleases(tenantId?: string, options?: { includeTasks?: boolean }) {
  const queryClient = useQueryClient();

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
        error: result.error,
      };
    },
    {
      enabled: !!tenantId, // Only fetch if tenantId exists
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh (releases change more frequently than configs)
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache time
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
      retry: 1, // Retry once on failure
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

  // Selectors - categorize releases
  const releases = data?.releases || [];
  
  const categorizeReleases = (releases: BackendReleaseResponse[]) => {
    const now = new Date();
    const upcoming: BackendReleaseResponse[] = [];
    const active: BackendReleaseResponse[] = [];
    const completed: BackendReleaseResponse[] = [];
    console.log('[useReleases] Categorizing releases:', releases);

    releases.forEach((release) => {
      if (release.status === 'COMPLETED' || release.status === 'ARCHIVED') {
        completed.push(release);
      } else if (release.status === 'IN_PROGRESS') {
        // Check if it's upcoming (targetReleaseDate in future) or active
        if (release.targetReleaseDate) {
          const targetDate = new Date(release.targetReleaseDate);
          if (targetDate > now) {
            upcoming.push(release);
          } else {
            active.push(release);
          }
        } else if (release.kickOffDate) {
          // If kickOffDate is set, it's active
          active.push(release);
        } else {
          // Default to active if no dates
          active.push(release);
        }
      }
    });

    return { upcoming, active, completed };
  };

  const { upcoming, active, completed } = categorizeReleases(releases);

  return {
    // Data
    releases,
    upcoming,
    active,
    completed,
    
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

