/**
 * Default Configuration Utility
 * Generates default configuration objects for new release configurations
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import { generateConfigId } from './release-config-storage';

/**
 * Create a default configuration object for a new release configuration
 */
export function createDefaultConfig(tenantId: string): Partial<ReleaseConfiguration> {
  return {
    id: generateConfigId(),
    tenantId,
    name: '',
    releaseType: 'PLANNED',
    isDefault: true,
    platforms: [],
    targets: [],
    buildUploadStep: 'MANUAL', // Default to manual upload
    buildPipelines: [],
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

