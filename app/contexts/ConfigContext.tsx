/**
 * Config Context
 * Provides system metadata and tenant configuration to all components
 * Uses React Query for data fetching with caching
 */

import { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';

// Centralized debug flag - set to true to enable console logs
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log('[ConfigContext]', ...args);
import { useSystemMetadata } from '~/hooks/useSystemMetadata';
import { useTenantConfig } from '~/hooks/useTenantConfig';
import { useReleaseConfigs } from '~/hooks/useReleaseConfigs';
import type {
  SystemMetadata,
  SystemMetadataBackend,
  TenantConfig,
  IntegrationProvider,
  ConnectedIntegration,
  PlatformOption,
  TargetOption,
  ReleaseTypeOption,
  ReleaseStageOption,
  ReleaseStatusOption,
  BuildEnvironmentOption,
} from '~/types/system-metadata';
import type { ReleaseConfiguration } from '~/types/release-config';
import {
  enrichIntegration,
  enrichPlatform,
  enrichTarget,
  enrichReleaseType,
  enrichReleaseStage,
  enrichReleaseStatus,
  enrichBuildEnvironment,
} from '~/constants/ui-metadata';

interface ConfigContextValue {
  // Data
  systemMetadata: SystemMetadata | undefined;
  tenantConfig: TenantConfig | undefined;
  
  // Loading states
  isLoadingMetadata: boolean;
  isLoadingTenantConfig: boolean;
  
  // Errors
  metadataError: Error | null;
  tenantConfigError: Error | null;
  
  // Selectors - Integrations
  getAvailableIntegrations: (category?: string) => IntegrationProvider[];
  getConnectedIntegrations: (category?: string) => ConnectedIntegration[];
  isIntegrationConnected: (providerId: string) => boolean;
  
  // Selectors - Platforms & Targets
  getAvailablePlatforms: () => PlatformOption[];
  getAvailableTargets: (platformId?: string) => TargetOption[]; // If platformId provided, filters by platform
  isPlatformEnabled: (platformId: string) => boolean;
  isTargetEnabled: (targetId: string) => boolean;
  
  // Selectors - Release Types
  getReleaseTypes: () => ReleaseTypeOption[];
  isReleaseTypeAllowed: (releaseTypeId: string) => boolean;
  
  // Selectors - Release Stages & Statuses
  getReleaseStages: () => ReleaseStageOption[];
  getReleaseStatuses: (stage?: string) => ReleaseStatusOption[];
  
  // Selectors - Build Environments
  getBuildEnvironments: (platformId?: string) => BuildEnvironmentOption[];
  
  // Release Configurations (Cached)
  releaseConfigs: ReleaseConfiguration[];
  activeReleaseConfigs: ReleaseConfiguration[];
  defaultReleaseConfig: ReleaseConfiguration | undefined;
  archivedReleaseConfigs: ReleaseConfiguration[];
  isLoadingReleaseConfigs: boolean;
  releaseConfigsError: Error | null;
  
  // Release Config Actions
  refreshReleaseConfigs: () => void;
  invalidateReleaseConfigs: () => void;
  updateReleaseConfigInCache: (configId: string, updater: (config: ReleaseConfiguration) => ReleaseConfiguration) => void;
  
  // Release Config Selectors
  getReleaseConfig: (id: string) => ReleaseConfiguration | undefined;
  getReleaseConfigsByType: (type: string) => ReleaseConfiguration[];
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({
  children,
  tenantId,
  initialSystemMetadata,
  initialTenantConfig,
}: {
  children: ReactNode;
  tenantId?: string;
  initialSystemMetadata?: SystemMetadataBackend | null;
  initialTenantConfig?: TenantConfig | null;
}) {
  // Fetch system metadata (global) - minimal backend data
  // Use initialData from server-side loader if provided
  const {
    data: systemMetadataBackend,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = useSystemMetadata(initialSystemMetadata);
  
  // Fetch tenant configuration (tenant-specific)
  // Use initialData from server-side loader if provided
  const {
    data: tenantConfig,
    isLoading: isLoadingTenantConfig,
    error: tenantConfigError,
  } = useTenantConfig(tenantId, initialTenantConfig);
  
  // Fetch release configurations (cached)
  const {
    configs: releaseConfigs,
    activeConfigs: activeReleaseConfigs,
    defaultConfig: defaultReleaseConfig,
    archivedConfigs: archivedReleaseConfigs,
    isLoading: isLoadingReleaseConfigs,
    error: releaseConfigsError,
    refetch: refreshReleaseConfigs,
    invalidateCache: invalidateReleaseConfigs,
    updateConfigInCache: updateReleaseConfigInCache,
  } = useReleaseConfigs(tenantId);
  
  // Enrich backend data with frontend UI metadata
  const systemMetadata = useMemo<SystemMetadata | undefined>(() => {
    if (!systemMetadataBackend) return undefined;

    const enriched = {
      releaseManagement: {
        integrations: {
          SOURCE_CONTROL: systemMetadataBackend.releaseManagement.integrations.SOURCE_CONTROL.map(enrichIntegration),
          COMMUNICATION: systemMetadataBackend.releaseManagement.integrations.COMMUNICATION.map(enrichIntegration),
          CI_CD: systemMetadataBackend.releaseManagement.integrations.CI_CD.map(enrichIntegration),
          TEST_MANAGEMENT: systemMetadataBackend.releaseManagement.integrations.TEST_MANAGEMENT.map(enrichIntegration),
          PROJECT_MANAGEMENT: systemMetadataBackend.releaseManagement.integrations.PROJECT_MANAGEMENT.map(enrichIntegration),
          APP_DISTRIBUTION: systemMetadataBackend.releaseManagement.integrations.APP_DISTRIBUTION.map(enrichIntegration),
        },
        platforms: systemMetadataBackend.releaseManagement.platforms.map(enrichPlatform),
        targets: systemMetadataBackend.releaseManagement.targets.map(enrichTarget),
        releaseTypes: systemMetadataBackend.releaseManagement.releaseTypes.map(enrichReleaseType),
        releaseStages: systemMetadataBackend.releaseManagement.releaseStages.map(enrichReleaseStage),
        releaseStatuses: systemMetadataBackend.releaseManagement.releaseStatuses.map(enrichReleaseStatus),
        buildEnvironments: systemMetadataBackend.releaseManagement.buildEnvironments.map(enrichBuildEnvironment),
      },
      system: systemMetadataBackend.system,
    };
    
    return enriched;
  }, [systemMetadataBackend]);
  
  // ============================================================================
  // Selector Functions
  // ============================================================================
  
  const getAvailableIntegrations = useCallback((category?: string): IntegrationProvider[] => {
    console.log('[ConfigContext] Available integrations :' + "category" + category, systemMetadata);
    if (!systemMetadata) return [];
    console.log('[ConfigContext] Available integrations:', systemMetadata);
    const integrations = systemMetadata.releaseManagement.integrations;
    
    if (category) {
      return integrations[category as keyof typeof integrations] || [];
    }
    
    // Return all integrations from all categories
    return [
      ...integrations.SOURCE_CONTROL,
      ...integrations.COMMUNICATION,
      ...integrations.CI_CD,
      ...integrations.TEST_MANAGEMENT,
      ...integrations.PROJECT_MANAGEMENT,
      ...integrations.APP_DISTRIBUTION,
    ];
  }, [systemMetadata]);
  
  const getConnectedIntegrations = useCallback((category?: string): ConnectedIntegration[] => {
    if (!tenantConfig?.releaseManagement?.connectedIntegrations) return [];
    //console.log('[ConfigContext] Connected integrations :' + "category" + category, tenantConfig?.releaseManagement?.connectedIntegrations);
    const connected = tenantConfig.releaseManagement.connectedIntegrations;
    
   
    
    if (category) {
      return connected[category as keyof typeof connected] || [];
    }
    
    // Return all connected integrations from all categories
    return [
      ...connected.SOURCE_CONTROL,
      ...connected.COMMUNICATION,
      ...connected.CI_CD,
      ...connected.TEST_MANAGEMENT,
      ...connected.PROJECT_MANAGEMENT,
      ...connected.APP_DISTRIBUTION,
    ];
  }, [tenantConfig]);
  
  const isIntegrationConnected = useCallback((providerId: string): boolean => {
    const connected = getConnectedIntegrations();
    return connected.some(i => i.providerId === providerId && i.status === 'CONNECTED');
  }, [getConnectedIntegrations]);
  
  const getAvailablePlatforms = useCallback((): PlatformOption[] => {
    return systemMetadata?.releaseManagement.platforms || [];
  }, [systemMetadata]);
  
  const getAvailableTargets = useCallback((platformId?: string): TargetOption[] => {
    if (!systemMetadata) return [];
    
    const allTargets = systemMetadata.releaseManagement.targets;
    
    // If no platformId, return all targets
    if (!platformId) {
      return allTargets;
    }
    
    // Find the platform and get its applicable targets
    const platform = systemMetadata.releaseManagement.platforms.find(p => p.id === platformId);
    if (!platform) return [];
    
    // Filter targets to only those applicable to this platform
    return allTargets.filter(target => platform.applicableTargets.includes(target.id));
  }, [systemMetadata]);
  
  const isTargetEnabled = useCallback((targetId: string): boolean => {
    return tenantConfig?.releaseManagement?.enabledTargets?.includes(targetId) || false;
  }, [tenantConfig]);
  
  const isPlatformEnabled = useCallback((platformId: string): boolean => {
    return tenantConfig?.releaseManagement?.enabledPlatforms?.includes(platformId) || false;
  }, [tenantConfig]);
  
  const getReleaseTypes = useCallback((): ReleaseTypeOption[] => {
    return systemMetadata?.releaseManagement.releaseTypes || [];
  }, [systemMetadata]);
  
  const isReleaseTypeAllowed = useCallback((releaseTypeId: string): boolean => {
    return tenantConfig?.releaseManagement?.allowedReleaseTypes?.includes(releaseTypeId) || false;
  }, [tenantConfig]);
  
  const getReleaseStages = useCallback((): ReleaseStageOption[] => {
    return systemMetadata?.releaseManagement.releaseStages || [];
  }, [systemMetadata]);
  
  const getReleaseStatuses = useCallback((stage?: string): ReleaseStatusOption[] => {
    if (!systemMetadata) return [];
    
    const statuses = systemMetadata.releaseManagement.releaseStatuses;
    if (stage) {
      return statuses.filter(s => s.stage === stage);
    }
    return statuses;
  }, [systemMetadata]);
  
  const getBuildEnvironments = useCallback((platformId?: string): BuildEnvironmentOption[] => {
    if (!systemMetadata) return [];
    
    const environments = systemMetadata.releaseManagement.buildEnvironments;
    if (platformId) {
      return environments.filter(e => e.applicablePlatforms.includes(platformId));
    }
    return environments;
  }, [systemMetadata]);
  
  // ============================================================================
  // Release Config Selectors
  // ============================================================================
  
  const getReleaseConfig = useCallback((id: string): ReleaseConfiguration | undefined => {
    return releaseConfigs.find(c => c.id === id);
  }, [releaseConfigs]);
  
  const getReleaseConfigsByType = useCallback((type: string): ReleaseConfiguration[] => {
    return releaseConfigs.filter(c => c.releaseType === type);
  }, [releaseConfigs]);
  
  
  const value: ConfigContextValue = {
    systemMetadata,
    tenantConfig: tenantConfig || undefined,
    isLoadingMetadata,
    isLoadingTenantConfig,
    metadataError: metadataError || null,
    tenantConfigError: tenantConfigError || null,
    
    // Selectors
    getAvailableIntegrations,
    getConnectedIntegrations,
    isIntegrationConnected,
    getAvailablePlatforms,
    getAvailableTargets,
    isPlatformEnabled,
    isTargetEnabled,
    getReleaseTypes,
    isReleaseTypeAllowed,
    getReleaseStages,
    getReleaseStatuses,
    getBuildEnvironments,
    
    // Release Configurations
    releaseConfigs,
    activeReleaseConfigs,
    defaultReleaseConfig,
    archivedReleaseConfigs,
    isLoadingReleaseConfigs,
    releaseConfigsError,
    refreshReleaseConfigs,
    invalidateReleaseConfigs,
    updateReleaseConfigInCache,
    getReleaseConfig,
    getReleaseConfigsByType,
  };
  
  // Single centralized debug log
  log('Config Data:', { systemMetadata, tenantConfig, releaseConfigs: releaseConfigs.length });
  
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

