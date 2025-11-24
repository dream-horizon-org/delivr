/**
 * Default Configuration Utility
 * Generates default configuration objects for new release configurations
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import { generateConfigId } from './release-config-storage';

/**
 * Create a default configuration object for a new release configuration
 * 
 * @param tenantId - Organization/Tenant ID
 * @returns Partial release configuration with sensible defaults
 */
export function createDefaultConfig(tenantId: string): Partial<ReleaseConfiguration> {
  return {
    id: generateConfigId(),
    tenantId,
    name: '',
    releaseType: 'PLANNED',
    isDefault: true,
    platforms: [], // Will be derived from targets
    targets: [], // User must select distribution targets
    buildUploadStep: 'MANUAL', // Default to manual upload (can switch to CI_CD)
    workflows: [], // Empty - only populated if buildUploadStep = 'CI_CD'
    testManagement: {
      enabled: false,
      provider: 'none',
    },
    scheduling: undefined, // Optional - user must opt-in
    communication: {
      slack: undefined,
      email: undefined,
    },
    jiraProject: {
      enabled: false,
      integrationId: '',
      platformConfigurations: [], // Will be populated when user enables JIRA and selects platforms
      createReleaseTicket: true,
      linkBuildsToIssues: true,
    },
    status: 'DRAFT',
  };
}

