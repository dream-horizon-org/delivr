import { useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ReleaseConfigsResponse {
  success: boolean;
  data: ReleaseConfiguration[];
}

const QUERY_KEY = (tenantId: string) => ['releaseConfigs', tenantId];

export function useReleaseConfigs(tenantId?: string) {
  const queryClient = useQueryClient();

  // Fetch all configs for tenant
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ReleaseConfigsResponse, Error>(
    QUERY_KEY(tenantId || ''),
    async () => {
      if (!tenantId) {
        return { success: false, data: [] };
      }
      
      console.log('[useReleaseConfigs] Fetching configs for tenant:', tenantId);
      const result = await apiGet<ReleaseConfiguration[]>(
        `/api/v1/tenants/${tenantId}/release-config`
      );
      
      console.log('[useReleaseConfigs] Received', result.data?.length || 0, 'configs', result.success ? 'successfully' : 'with error');
      
      if (result.error) {
        console.error('[useReleaseConfigs] Error:', result.error);
      }
      
      return {
        success: result.success,
        data: result.data || [],
      };
    },
    {
      enabled: !!tenantId, // Only fetch if tenantId exists
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      cacheTime: 30 * 60 * 1000, // 30 minutes - cache time
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
      retry: 1, // Retry once on failure
    }
  );

  // Invalidate cache (call after create/update/delete)
  const invalidateCache = () => {
    if (tenantId) {
      console.log('[useReleaseConfigs] Invalidating cache for tenant:', tenantId);
      queryClient.invalidateQueries(QUERY_KEY(tenantId));
    }
  };

  // Optimistically update a single config
  const updateConfigInCache = (configId: string, updater: (config: ReleaseConfiguration) => ReleaseConfiguration) => {
    if (!tenantId) return;
    
    queryClient.setQueryData<ReleaseConfigsResponse>(
      QUERY_KEY(tenantId),
      (old: ReleaseConfigsResponse | undefined): ReleaseConfigsResponse => {
        if (!old) return { success: false, data: [] };
        
        return {
          ...old,
          data: old.data.map(config =>
            config.id === configId ? updater(config) : config
          ),
        };
      }
    );
  };

  // Remove a config from cache optimistically
  const removeConfigFromCache = (configId: string) => {
    if (!tenantId) return;
    
    queryClient.setQueryData<ReleaseConfigsResponse>(
      QUERY_KEY(tenantId),
      (old: ReleaseConfigsResponse | undefined): ReleaseConfigsResponse => {
        if (!old) return { success: false, data: [] };
        
        return {
          ...old,
          data: old.data.filter(config => config.id !== configId),
        };
      }
    );
  };

  // Memoized selectors to prevent unnecessary re-renders
  const configs = useMemo(() => data?.data || [], [data?.data]);
  
  const activeConfigs = useMemo(
    () => configs.filter((c: ReleaseConfiguration) => c.isActive),
    [configs]
  );
  
  const defaultConfig = useMemo(
    () => configs.find((c: ReleaseConfiguration) => c.isDefault),
    [configs]
  );
  
  const archivedConfigs = useMemo(
    () => configs.filter((c: ReleaseConfiguration) => !c.isActive),
    [configs]
  );

  return {
    // Data
    configs,
    activeConfigs,
    defaultConfig,
    archivedConfigs,
    
    // Loading & Error
    isLoading,
    error: error as Error | null,
    
    // Actions
    refetch,
    invalidateCache,
    updateConfigInCache,
    removeConfigFromCache,
  };
}

/**
 * Get release configs by type
 */
export function useReleaseConfigsByType(tenantId: string | undefined, releaseType: string) {
  const { configs, isLoading, error } = useReleaseConfigs(tenantId);
  
  const configsByType = configs.filter((c: ReleaseConfiguration) => c.releaseType === releaseType);
  
  return {
    configs: configsByType,
    isLoading,
    error,
  };
}

/**
 * Get a single release config by ID
 */
export function useReleaseConfig(tenantId: string | undefined, configId: string | undefined) {
  const { configs, isLoading, error } = useReleaseConfigs(tenantId);
  
  const config = configs.find((c: ReleaseConfiguration) => c.id === configId);
  
  return {
    config,
    isLoading,
    error,
  };
}

