/**
 * React Query hook for fetching app-specific configuration
 * Uses the /api/v1/apps/:appId endpoint (new shape: platformTargets, integrations, allowedReleaseTypes)
 * Derives enabledPlatforms, enabledTargets, hasDotaTarget from platformTargets
 */

import { useQuery } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { TenantConfig } from '~/types/system-metadata';

interface AppInfoResponse {
  app?: { id: string; displayName?: string };
  organisation?: { id: string; displayName?: string };
  platformTargets?: Array<{ platform: string; target: string }>;
  integrations?: TenantConfig['connectedIntegrations'];
  allowedReleaseTypes?: string[];
}

const EMPTY_INTEGRATIONS: TenantConfig['connectedIntegrations'] = {
  SOURCE_CONTROL: [],
  COMMUNICATION: [],
  CI_CD: [],
  TEST_MANAGEMENT: [],
  PROJECT_MANAGEMENT: [],
  APP_DISTRIBUTION: [],
};

async function fetchAppConfig(appId: string): Promise<TenantConfig | null> {
  const result = await apiGet<AppInfoResponse>(
    `/api/v1/apps/${appId}`,
    { headers: { 'Accept': 'application/json' } }
  );

  const data = result.data;
  if (!data) return null;

  const app = data.app ?? data.organisation;
  if (!app) return null;

  const platformTargets = data.platformTargets ?? [];
  const connectedIntegrations = data.integrations ?? EMPTY_INTEGRATIONS;
  const allowedReleaseTypes = data.allowedReleaseTypes ?? [];

  const enabledPlatforms =
    platformTargets.length > 0 ? [...new Set(platformTargets.map((pt) => pt.platform))] : [];
  const enabledTargets =
    platformTargets.length > 0 ? [...new Set(platformTargets.map((pt) => pt.target))] : [];
  const hasDotaTarget = platformTargets.some((pt) => pt.target === 'DOTA');

  return {
    appId,
    organization: { id: '', name: '' },
    connectedIntegrations,
    enabledPlatforms,
    enabledTargets,
    allowedReleaseTypes,
    hasDotaTarget,
  };
}

export function useAppConfig(
  appId: string | undefined,
  initialData?: TenantConfig | null
) {
  return useQuery<TenantConfig | null, Error>(
    ['app', appId, 'config'],
    () => fetchAppConfig(appId!),
    {
      enabled: !!appId, // Only fetch if appId exists
      initialData: initialData || undefined, // Use initialData if provided
      staleTime: 100 * 60 * 5, // 5 minutes - can change more frequently
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 2,
    }
  );
}

