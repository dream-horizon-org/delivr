/**
 * Default Configuration Utility
 * Generates default configuration objects for new release configurations
 */

import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * Create a default configuration object for a new release configuration
 * 
 * @param tenantId - Organization/Tenant ID
 * @returns Partial release configuration with sensible defaults
 */
export function createDefaultConfig(tenantId: string): Partial<ReleaseConfiguration> {
  return {
    // id is omitted - backend will generate it on save
    tenantId,
    name: '',
    releaseType: 'MINOR',
    isDefault: true,
    platformTargets: [], // User must select platform-target combinations
    hasManualBuildUpload: true, // Default to manual upload (false = CI/CD)
    workflows: [], // Empty - only populated if hasManualBuildUpload = false
    testManagement: undefined, // Optional - user must enable
    scheduling: undefined, // Optional - user must opt-in
    communication: undefined, // Optional - user must enable
    projectManagement: undefined, // Optional - user must enable
    status: 'DRAFT',
  };
}

