/**
 * System Metadata Utilities
 * Transformation logic for building system metadata response
 */

import * as fs from 'fs';
import * as path from 'path';
import { SCM_PROVIDERS } from '../controllers/integrations/scm/providers.constants';
import { CICD_PROVIDERS } from '../controllers/integrations/ci-cd/providers.constants';
import { TEST_MANAGEMENT_PROVIDERS } from '../controllers/integrations/test-management/tenant-integration/tenant-integration.constants';
import { COMM_PROVIDERS } from '../controllers/integrations/comm/comm-integration/comm-integration.constants';
import {
  SYSTEM_PLATFORMS,
  SYSTEM_TARGETS,
  SYSTEM_RELEASE_TYPES,
  SYSTEM_BUILD_ENVIRONMENTS,
  SYSTEM_RELEASE_STATUSES,
  SYSTEM_PROJECT_MANAGEMENT_PROVIDERS,
  SYSTEM_APP_DISTRIBUTION_PROVIDERS,
  SYSTEM_FEATURES,
} from './system-metadata.constants';

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrationProviderMetadata {
  id: string;
  name: string;
  requiresOAuth: boolean;
  isAvailable: boolean;
}

export interface SystemMetadataResponse {
  releaseManagement: {
    integrations: {
      SOURCE_CONTROL: IntegrationProviderMetadata[];
      COMMUNICATION: IntegrationProviderMetadata[];
      CI_CD: IntegrationProviderMetadata[];
      TEST_MANAGEMENT: IntegrationProviderMetadata[];
      PROJECT_MANAGEMENT: IntegrationProviderMetadata[];
      APP_DISTRIBUTION: IntegrationProviderMetadata[];
    };
    platforms: Array<{
      id: string;
      name: string;
      applicableTargets: readonly string[];
      isAvailable: boolean;
      status?: string;
    }>;
    targets: Array<{
      id: string;
      name: string;
      isAvailable: boolean;
      status?: string;
    }>;
    releaseTypes: Array<{
      id: string;
      name: string;
    }>;
    buildEnvironments: Array<{
      id: string;
      name: string;
      order: number;
      applicablePlatforms: readonly string[];
    }>;
    releaseStatuses: Array<{
      id: string;
      name: string;
    }>;
  };
  system: {
    version: string;
    features: Record<string, boolean>;
  };
}

// ============================================================================
// VERSION UTILITIES
// ============================================================================

/**
 * Get system version from package.json
 * Falls back to default version if package.json cannot be read
 */
export function getSystemVersion(defaultVersion: string = '0.0.1'): string {
  try {
    // Path: from compiled bin/script/routes/management.js -> api/package.json
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || defaultVersion;
  } catch (error) {
    console.warn('Failed to read package.json for version, using default:', error);
    return defaultVersion;
  }
}

// ============================================================================
// INTEGRATION TRANSFORMATIONS
// ============================================================================

/**
 * Transform SCM providers to metadata format
 */
export function transformScmProviders(): IntegrationProviderMetadata[] {
  return SCM_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    requiresOAuth: provider.requiresOAuth,
    isAvailable: provider.enabled,
  }));
}

/**
 * Transform CI/CD providers to metadata format
 */
export function transformCicdProviders(): IntegrationProviderMetadata[] {
  return CICD_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    requiresOAuth: provider.requiresOAuth,
    isAvailable: provider.enabled,
  }));
}

/**
 * Transform test management providers to metadata format
 */
export function transformTestManagementProviders(): IntegrationProviderMetadata[] {
  return TEST_MANAGEMENT_PROVIDERS.map((provider) => ({
    id: provider.type,
    name: provider.name,
    requiresOAuth: false,
    isAvailable: provider.enabled,
  }));
}

/**
 * Transform communication providers to metadata format
 */
export function transformCommProviders(): IntegrationProviderMetadata[] {
  return COMM_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    requiresOAuth: false,
    isAvailable: provider.enabled,
  }));
}

/**
 * Transform project management providers to metadata format
 */
export function transformProjectManagementProviders(): IntegrationProviderMetadata[] {
  return Object.values(SYSTEM_PROJECT_MANAGEMENT_PROVIDERS);
}

/**
 * Transform app distribution providers to metadata format
 */
export function transformAppDistributionProviders(): IntegrationProviderMetadata[] {
  return Object.values(SYSTEM_APP_DISTRIBUTION_PROVIDERS);
}

// ============================================================================
// METADATA BUILDERS
// ============================================================================

/**
 * Build complete system metadata response
 */
export function buildSystemMetadata(): SystemMetadataResponse {
  const systemVersion = getSystemVersion();

  return {
    releaseManagement: {
      integrations: {
        SOURCE_CONTROL: transformScmProviders(),
        COMMUNICATION: transformCommProviders(),
        CI_CD: transformCicdProviders(),
        TEST_MANAGEMENT: transformTestManagementProviders(),
        PROJECT_MANAGEMENT: transformProjectManagementProviders(),
        APP_DISTRIBUTION: transformAppDistributionProviders(),
      },
      platforms: Object.values(SYSTEM_PLATFORMS),
      targets: Object.values(SYSTEM_TARGETS),
      releaseTypes: Object.values(SYSTEM_RELEASE_TYPES),
      buildEnvironments: Object.values(SYSTEM_BUILD_ENVIRONMENTS),
      releaseStatuses: Object.values(SYSTEM_RELEASE_STATUSES),
    },
    system: {
      version: systemVersion,
      features: {
        [SYSTEM_FEATURES.RELEASE_MANAGEMENT]: true,
        [SYSTEM_FEATURES.INTEGRATIONS]: true,
      },
    },
  };
}

