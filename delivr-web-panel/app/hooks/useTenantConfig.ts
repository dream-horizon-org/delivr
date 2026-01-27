/**
 * React Query hook for fetching app-specific configuration
 * Uses the /api/v1/apps/:appId endpoint
 * Extracts the releaseManagement.config from the response
 * Supports initialData from server-side loader for faster initial load
 */

import { useQuery } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { TenantConfig } from '~/types/system-metadata';

interface AppInfoResponse {
  app?: {
    id: string;
    displayName: string;
  };
  organisation?: {
    id: string;
    displayName: string;
    releaseManagement?: {
      config?: {
        connectedIntegrations: any;
        enabledPlatforms: string[];
        enabledTargets: string[];
        allowedReleaseTypes: string[];
      };
      integrations?: any[];
    };
  };
}

async function fetchAppConfig(appId: string): Promise<TenantConfig | null> {
  const result = await apiGet<AppInfoResponse>(
    `/api/v1/apps/${appId}`,
    { headers: { 'Accept': 'application/json' } }
  );
  
  const data = result.data;
  if (!data) return null;
  
  // Handle both new format (app) and legacy format (organisation)
  const app = data.app || data.organisation;
  if (!app) return null;
  
  // Extract and structure the config
  const config = data.organisation?.releaseManagement?.config;
  if (!config) return null;
  
  return {
    tenantId: appId, // Keep tenantId for backward compatibility with TenantConfig type
    organization: {
      id: app.id,
      name: app.displayName,
    },
    releaseManagement: {
      connectedIntegrations: config.connectedIntegrations,
      enabledPlatforms: config.enabledPlatforms,
      enabledTargets: config.enabledTargets,
      allowedReleaseTypes: config.allowedReleaseTypes,
    },
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

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useAppConfig instead
 */
export function useTenantConfig(
  tenantId: string | undefined,
  initialData?: TenantConfig | null
) {
  return useAppConfig(tenantId, initialData);
}
