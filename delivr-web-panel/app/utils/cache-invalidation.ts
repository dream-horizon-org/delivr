/**
 * Cache Invalidation Utilities
 * Centralized functions for invalidating React Query caches
 */

import type { QueryClient } from 'react-query';

/**
 * Invalidate app config cache (getApp / useAppConfig).
 * Triggers a refetch of app configuration including connected integrations.
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to invalidate cache for
 */
export async function invalidateAppConfig(
  queryClient: QueryClient,
  appId: string
): Promise<void> {
  await queryClient.invalidateQueries(['app', appId, 'config']);
}

/**
 * Refetch app config in the background (non-blocking).
 * Use after integration add/update/delete so UI reflects latest connected integrations.
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to refetch config for
 */
export function refetchAppConfigInBackground(
  queryClient: QueryClient,
  appId: string
): void {
  void invalidateAppConfig(queryClient, appId).catch((error) => {
    console.warn('[Cache Invalidation] Failed to refetch app config in background:', error);
  });
}

/**
 * Invalidate release configs cache (useReleaseConfigs).
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to invalidate cache for
 */
export async function invalidateReleaseConfigs(
  queryClient: QueryClient,
  appId: string
): Promise<void> {
  await queryClient.invalidateQueries(['releaseConfigs', appId]);
}

/**
 * Invalidate app collaborators cache (GET /api/v1/apps/:appId/collaborators).
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to invalidate cache for
 */
export async function invalidateAppCollaborators(
  queryClient: QueryClient,
  appId: string
): Promise<void> {
  await queryClient.invalidateQueries(['app-collaborators', appId]);
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
 * Invalidate releases cache (useReleases).
 * Triggers a refetch of all releases for the app.
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to invalidate cache for
 */
export async function invalidateReleases(
  queryClient: QueryClient,
  appId: string
): Promise<void> {
  await queryClient.invalidateQueries(['releases', appId]);
}

/**
 * Invalidate activity logs cache for a release
 * This will trigger a refetch of activity logs after user actions
 * 
 * @param queryClient - React Query client instance
 * @param appId - app id
 * @param releaseId - Release ID
 * 
 * @example
 * ```tsx
 * import { invalidateActivityLogs } from '~/utils/cache-invalidation';
 * import { useQueryClient } from 'react-query';
 * 
 * const queryClient = useQueryClient();
 * await invalidateActivityLogs(queryClient, appId, releaseId);
 * ```
 */
export async function invalidateActivityLogs(
  queryClient: QueryClient,
  appId: string,
  releaseId: string
): Promise<void> {
  await queryClient.invalidateQueries(['release-process', 'activity', appId, releaseId]);
}

/**
 * Invalidate all app-related caches (app config, release configs, releases).
 * Useful after major operations like switching app or updating global settings.
 *
 * @param queryClient - React Query client instance
 * @param appId - app id to invalidate cache for
 */
export async function invalidateAllAppCaches(
  queryClient: QueryClient,
  appId: string
): Promise<void> {
  await Promise.all([
    invalidateAppConfig(queryClient, appId),
    invalidateReleaseConfigs(queryClient, appId),
    invalidateReleases(queryClient, appId),
  ]);
}

