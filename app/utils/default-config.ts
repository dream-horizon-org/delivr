/**
 * Default Configuration Utility
 * Generates default configuration objects for new release configurations
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import { generateConfigId } from './release-config-storage';

/**
 * Create a default configuration object for a new release configuration
 */
export function createDefaultConfig(organizationId: string): Partial<ReleaseConfiguration> {
  return {
    id: generateConfigId(),
    organizationId,
    name: '',
    releaseType: 'PLANNED',
    isDefault: true,
    platforms: [],
    defaultTargets: [],
    buildPipelines: [],
    testManagement: {
      enabled: false,
      provider: 'none',
    },
    scheduling: {
      releaseFrequency: 'WEEKLY',
      customFrequencyDays: undefined,
      firstReleaseKickoffDate: '', // To be set by user
      initialVersions: {}, // Will be populated based on selected platforms
      kickoffTime: '10:00',
      kickoffReminderEnabled: true,
      kickoffReminderTime: '09:00',
      targetReleaseTime: '18:00',
      targetReleaseDateOffsetFromKickoff: 5,
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      timezone: 'Asia/Kolkata',
      regressionSlots: [],
    },
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

