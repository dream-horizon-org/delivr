/**
 * React Query hook for fetching tenant-specific configuration
 * Uses the existing /api/v1/tenants/:tenantId endpoint
 * Extracts the releaseManagement.config from the response
 */

import { useQuery } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { TenantConfig } from '~/types/system-metadata';

interface TenantInfoResponse {
  organisation: {
    id: string;
    displayName: string;
    releaseManagement?: {
      config?: {
        connectedIntegrations: any;
        enabledPlatforms: string[];
        enabledTargets: string[];
        allowedReleaseTypes: string[];
        customSettings: any;
      };
      setupComplete?: boolean;
      setupSteps?: any;
      integrations?: any[];
    };
  };
}

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const result = await apiGet<TenantInfoResponse>(
    `/api/v1/tenants/${tenantId}`,
    { headers: { 'Accept': 'application/json' } }
  );
  
  const data = result.data;
  if (!data) return null;
  
  // Extract and structure the config
  const config = data.organisation?.releaseManagement?.config;
  if (!config) return null;
  
  return {
    tenantId,
    organization: {
      id: data.organisation.id,
      name: data.organisation.displayName,
    },
    releaseManagement: {
      connectedIntegrations: config.connectedIntegrations,
      enabledPlatforms: config.enabledPlatforms,
      enabledTargets: config.enabledTargets,
      allowedReleaseTypes: config.allowedReleaseTypes,
      customSettings: config.customSettings,
    },
  };
}

export function useTenantConfig(tenantId: string | undefined) {
  return useQuery<TenantConfig | null, Error>(
    ['tenant', tenantId, 'config'],
    () => fetchTenantConfig(tenantId!),
    {
      enabled: !!tenantId, // Only fetch if tenantId exists
      staleTime: 1000 * 60 * 5, // 5 minutes - can change more frequently
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 2,
    }
  );
}
