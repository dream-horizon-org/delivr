/**
 * Release Configurations Hook
 * Provides cached release configurations using React Query
 * 
 * Features:
 * - Automatic caching with 5-minute freshness
 * - Background refetching for always-fresh data
 * - Cache invalidation for mutations
 * - Selectors for common queries
 */

import { useQuery, useQueryClient } from 'react-query';
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
      
      const response = await fetch(`/api/v1/tenants/${tenantId}/release-config`);
      
      if (!response.ok) {
        console.error('[useReleaseConfigs] Fetch failed:', response.status);
        throw new Error(`Failed to fetch release configs: ${response.statusText}`);
      }
      
      const result: ReleaseConfigsResponse = await response.json();
      console.log('[useReleaseConfigs] Fetched', result.data?.length || 0, 'configs');
      
      return result;
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

  // Selectors
  const configs = data?.data || [];
  const activeConfigs = configs.filter(c => c.isActive);
  const defaultConfig = configs.find(c => c.isDefault);
  const archivedConfigs = configs.filter(c => !c.isActive);

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
  
  const configsByType = configs.filter(c => c.releaseType === releaseType);
  
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
  
  const config = configs.find(c => c.id === configId);
  
  return {
    config,
    isLoading,
    error,
  };
}

