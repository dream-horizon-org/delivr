/**
 * Cache Invalidation Utilities
 * Centralized functions for invalidating React Query caches
 */

import type { QueryClient } from 'react-query';

/**
 * Invalidate tenant config cache
 * This will trigger a refetch of tenant configuration including connected integrations
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID to invalidate cache for
 * 
 * @example
 * ```tsx
 * import { invalidateTenantConfig } from '~/utils/cache-invalidation';
 * import { useQueryClient } from 'react-query';
 * 
 * const queryClient = useQueryClient();
 * await invalidateTenantConfig(queryClient, tenantId);
 * ```
 */
export async function invalidateTenantConfig(
  queryClient: QueryClient,
  tenantId: string
): Promise<void> {
  await queryClient.invalidateQueries(['tenant', tenantId, 'config']);
}

/**
 * Refetch tenant config in the background (non-blocking)
 * Use this after integration create/update/delete operations to ensure UI reflects latest changes
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID to refetch config for
 * 
 * @example
 * ```tsx
 * import { refetchTenantConfigInBackground } from '~/utils/cache-invalidation';
 * import { useQueryClient } from 'react-query';
 * 
 * const queryClient = useQueryClient();
 * // After successful integration operation:
 * refetchTenantConfigInBackground(queryClient, tenantId);
 * ```
 */
export function refetchTenantConfigInBackground(
  queryClient: QueryClient,
  tenantId: string
): void {
  // Fire and forget - refetch in background without blocking
  void invalidateTenantConfig(queryClient, tenantId).catch((error) => {
    // Silently handle errors - background refetch failures shouldn't break the UI
    console.warn('[Cache Invalidation] Failed to refetch tenant config in background:', error);
  });
}

/**
 * Invalidate release configs cache
 * This will trigger a refetch of all release configurations for a tenant
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID to invalidate cache for
 */
export async function invalidateReleaseConfigs(
  queryClient: QueryClient,
  tenantId: string
): Promise<void> {
  await queryClient.invalidateQueries(['tenant', tenantId, 'release-configs']);
}

/**
 * Invalidate system metadata cache
 * This will trigger a refetch of global system metadata
 * 
 * @param queryClient - React Query client instance
 */
export async function invalidateSystemMetadata(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries(['system', 'metadata']);
}

/**
 * Invalidate releases cache
 * This will trigger a refetch of all releases for a tenant
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID to invalidate cache for
 */
export async function invalidateReleases(
  queryClient: QueryClient,
  tenantId: string
): Promise<void> {
  await queryClient.invalidateQueries(['releases', tenantId]);
}

/**
 * Invalidate activity logs cache for a release
 * This will trigger a refetch of activity logs after user actions
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID
 * @param releaseId - Release ID
 * 
 * @example
 * ```tsx
 * import { invalidateActivityLogs } from '~/utils/cache-invalidation';
 * import { useQueryClient } from 'react-query';
 * 
 * const queryClient = useQueryClient();
 * await invalidateActivityLogs(queryClient, tenantId, releaseId);
 * ```
 */
export async function invalidateActivityLogs(
  queryClient: QueryClient,
  tenantId: string,
  releaseId: string
): Promise<void> {
  await queryClient.invalidateQueries(['release-process', 'activity', tenantId, releaseId]);
}

/**
 * Invalidate all tenant-related caches
 * Useful after major operations like switching tenants or updating global settings
 * 
 * @param queryClient - React Query client instance
 * @param tenantId - Tenant ID to invalidate cache for
 */
export async function invalidateAllTenantCaches(
  queryClient: QueryClient,
  tenantId: string
): Promise<void> {
  await Promise.all([
    invalidateTenantConfig(queryClient, tenantId),
    invalidateReleaseConfigs(queryClient, tenantId),
    invalidateReleases(queryClient, tenantId),
  ]);
}

