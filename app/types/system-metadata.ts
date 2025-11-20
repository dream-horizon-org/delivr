/**
 * System Metadata Types
 * Types for dynamic configuration fetched from backend
 */

// ============================================================================
// Integration Providers (Minimal from Backend)
// ============================================================================

export interface IntegrationProviderBackend {
  id: string;
  name: string;
  requiresOAuth?: boolean;
  isAvailable: boolean;
}

// Enriched with frontend UI metadata
export interface IntegrationProvider extends IntegrationProviderBackend {
  description: string;
  icon: string;
  comingSoon?: boolean;
  // isAvailable inherited from IntegrationProviderBackend
}

export interface ConnectedIntegration {
  id: string;
  providerId: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  config: Record<string, any>;
  verificationStatus: 'VALID' | 'INVALID' | 'PENDING';
  connectedAt?: string;
  connectedBy?: string;
}

// ============================================================================
// Platforms & Targets (Minimal from Backend)
// ============================================================================

export interface PlatformOptionBackend {
  id: string;
  name: string;
  applicableTargets: string[];
}

// Enriched with frontend UI metadata
export interface PlatformOption extends PlatformOptionBackend {
  description: string;
  icon: string;
  color: string;
}

export interface TargetOptionBackend {
  id: string;
  name: string;
}

// Enriched with frontend UI metadata
export interface TargetOption extends TargetOptionBackend {
  description: string;
  icon: string;
  requiresCredentials: boolean;
}

// ============================================================================
// Release Types (Minimal from Backend)
// ============================================================================

export interface ReleaseTypeOptionBackend {
  id: string;
  name: string;
}

// Enriched with frontend UI metadata
export interface ReleaseTypeOption extends ReleaseTypeOptionBackend {
  description: string;
  icon: string;
  color: string;
  defaultScheduling: {
    kickoffLeadDays: number;
    releaseFrequency: string;
  };
}

// ============================================================================
// Release Stages & Statuses (Minimal from Backend)
// ============================================================================

export interface ReleaseStageOptionBackend {
  id: string;
  name: string;
  order: number;
}

// Enriched with frontend UI metadata
export interface ReleaseStageOption extends ReleaseStageOptionBackend {
  description: string;
  color: string;
  icon: string;
  allowedActions: string[];
}

export interface ReleaseStatusOptionBackend {
  id: string;
  name: string;
  stage: string | null;
}

// Enriched with frontend UI metadata
export interface ReleaseStatusOption extends ReleaseStatusOptionBackend {
  description: string;
  color: string;
  isInitial?: boolean;
  isFinal?: boolean;
}

// ============================================================================
// Build Environments (Minimal from Backend)
// ============================================================================

export interface BuildEnvironmentOptionBackend {
  id: string;
  name: string;
  order: number;
  applicablePlatforms: string[];
}

// Enriched with frontend UI metadata
export interface BuildEnvironmentOption extends BuildEnvironmentOptionBackend {
  description: string;
  icon: string;
  isRequired: boolean;
}

// ============================================================================
// System Metadata Response
// ============================================================================

// Backend response (minimal)
export interface SystemMetadataBackend {
  releaseManagement: {
    integrations: {
      SOURCE_CONTROL: IntegrationProviderBackend[];
      COMMUNICATION: IntegrationProviderBackend[];
      CI_CD: IntegrationProviderBackend[];
      TEST_MANAGEMENT: IntegrationProviderBackend[];
      PROJECT_MANAGEMENT: IntegrationProviderBackend[];
      APP_DISTRIBUTION: IntegrationProviderBackend[];
    };
    platforms: PlatformOptionBackend[];
    targets: TargetOptionBackend[];
    releaseTypes: ReleaseTypeOptionBackend[];
    releaseStages: ReleaseStageOptionBackend[];
    releaseStatuses: ReleaseStatusOptionBackend[];
    buildEnvironments: BuildEnvironmentOptionBackend[];
  };
  system: {
    version: string;
    features: Record<string, boolean>;
  };
}

// Enriched with frontend UI metadata (what components use)
export interface SystemMetadata {
  releaseManagement: {
    integrations: {
      SOURCE_CONTROL: IntegrationProvider[];
      COMMUNICATION: IntegrationProvider[];
      CI_CD: IntegrationProvider[];
      TEST_MANAGEMENT: IntegrationProvider[];
      PROJECT_MANAGEMENT: IntegrationProvider[];
      APP_DISTRIBUTION: IntegrationProvider[];
    };
    platforms: PlatformOption[];
    targets: TargetOption[];
    releaseTypes: ReleaseTypeOption[];
    releaseStages: ReleaseStageOption[];
    releaseStatuses: ReleaseStatusOption[];
    buildEnvironments: BuildEnvironmentOption[];
  };
  system: {
    version: string;
    features: Record<string, boolean>;
  };
}

// ============================================================================
// Tenant Configuration Response
// ============================================================================

export interface TenantConfig {
  tenantId: string;
  organization: {
    id: string;
    name: string;
  };
  releaseManagement: {
    // Connected integrations by category
    connectedIntegrations: {
      SOURCE_CONTROL: ConnectedIntegration[];
      COMMUNICATION: ConnectedIntegration[];
      CI_CD: ConnectedIntegration[];
      TEST_MANAGEMENT: ConnectedIntegration[];
      PROJECT_MANAGEMENT: ConnectedIntegration[];
      APP_DISTRIBUTION: ConnectedIntegration[];
    };
    
    // Enabled platforms for this tenant
    enabledPlatforms: string[]; // e.g., ["ANDROID", "IOS"]
    
    // Enabled targets for this tenant
    enabledTargets: string[]; // e.g., ["APP_STORE", "PLAY_STORE", "WEB"]
    
    // Allowed release types for this tenant
    allowedReleaseTypes: string[];
    
    // Custom settings
    customSettings: Record<string, any>;
  };
}

