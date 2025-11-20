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
    defaultTargets: [],
    buildPipelines: [],
    testManagement: {
      enabled: false,
      provider: 'NONE',
    },
    scheduling: {
      releaseFrequency: 'WEEKLY',
      defaultReleaseTime: '18:00',
      defaultKickoffTime: '10:00',
      kickoffLeadDays: 7,
      kickoffReminderEnabled: true,
      kickoffReminderTime: '09:00',
      kickoffReminderLeadDays: 1,
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
      projectKey: '',
    },
    status: 'DRAFT',
  };
}

