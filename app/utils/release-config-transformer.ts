/**
 * Release Config Transformer
 * Transforms verbose backend response to UI format for edit/clone operations
 */

import type { ReleaseConfiguration, Workflow, TestManagementConfig, CommunicationConfig } from '~/types/release-config';
import { transformFromPlatformTargetsArray, type PlatformTarget } from '~/utils/platform-mapper';

/**
 * Transform backend workflow configuration to UI workflow format
 * Backend may include additional metadata that UI doesn't need
 */
export function transformWorkflowsFromBackend(workflows: any[]): Workflow[] {
  if (!workflows || !Array.isArray(workflows)) {
    return [];
  }

  return workflows.map((workflow: any) => ({
    id: workflow.id || workflow._id || `workflow-${Date.now()}`,
    name: workflow.name,
    platform: workflow.platform,
    environment: workflow.environment,
    provider: workflow.provider,
    providerConfig: workflow.providerConfig,
    enabled: workflow.enabled ?? true,
    timeout: workflow.timeout,
    retryAttempts: workflow.retryAttempts,
  }));
}

/**
 * Transform backend test management config to UI format
 * Backend may include additional fields like createdAt, updatedAt, etc.
 */
export function transformTestManagementFromBackend(config: any): TestManagementConfig {
  if (!config) {
    return {
      checkmate: {
        enabled: false,
      },
      testrail: {
        enabled: false,
      },
    };
  }

  return {
    checkmate: {
      enabled: config.checkmate?.enabled ?? false,
      integrationId: config.checkmate?.integrationId,
      sectionMapping: config.checkmate?.sectionMapping || {},
      labelMapping: config.checkmate?.labelMapping || {},
      squadMapping: config.checkmate?.squadMapping || {},
    },
    testrail: {
      enabled: config.testrail?.enabled ?? false,
      integrationId: config.testrail?.integrationId,
      projectId: config.testrail?.projectId,
      suiteId: config.testrail?.suiteId,
    },
  };
}

/**
 * Transform backend communication config to UI format
 * Backend may include resolved channel data with additional metadata
 */
export function transformCommunicationFromBackend(config: any): CommunicationConfig {
  if (!config) {
    return {};
  }

  const transformed: CommunicationConfig = {};

  // Slack configuration
  if (config.slack) {
    transformed.slack = {
      enabled: config.slack.enabled ?? false,
      integrationId: config.slack.integrationId,
      channelData: {
        releases: config.slack.channelData?.releases || [],
        builds: config.slack.channelData?.builds || [],
        regression: config.slack.channelData?.regression || [],
        critical: config.slack.channelData?.critical || [],
      },
    };
  }

  // Email configuration
  if (config.email) {
    transformed.email = {
      enabled: config.email.enabled ?? false,
      notificationEmails: config.email.notificationEmails || [],
    };
  }

  return transformed;
}

/**
 * Transform backend JIRA config to UI format
 */
export function transformJiraFromBackend(config: any): any {
  if (!config) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: config.enabled ?? false,
    integrationId: config.integrationId,
    // Platform-specific configs
    platformConfigs: config.platformConfigs || {},
  };
}

/**
 * Transform backend scheduling config to UI format
 */
export function transformSchedulingFromBackend(scheduling: any): any {
  if (!scheduling) {
    return undefined;
  }

  return {
    enabled: scheduling.enabled ?? false,
    releaseFrequency: scheduling.releaseFrequency,
    releaseDay: scheduling.releaseDay,
    releaseTime: scheduling.releaseTime,
    timezone: scheduling.timezone,
    autoCreateRelease: scheduling.autoCreateRelease ?? false,
  };
}

/**
 * Main transformer: Transform complete backend release config to UI format
 * This is the primary function used when loading a config for edit/clone
 * 
 * @param backendConfig - Complete release configuration from backend
 * @returns Transformed configuration ready for UI
 */
export function transformReleaseConfigFromBackend(backendConfig: any): ReleaseConfiguration {
  // Basic fields
  const config: ReleaseConfiguration = {
    id: backendConfig.id || backendConfig._id,
    tenantId: backendConfig.tenantId,
    name: backendConfig.name,
    description: backendConfig.description,
    releaseType: backendConfig.releaseType,
    isDefault: backendConfig.isDefault ?? false,
    baseBranch: backendConfig.baseBranch,
    
    // Transform platformTargets to platforms and targets arrays for UI
    platforms: [],
    targets: [],
    
    // Build upload method
    buildUploadStep: backendConfig.buildUploadStep || 'MANUAL',
    
    // Transform nested configurations
    workflows: transformWorkflowsFromBackend(backendConfig.workflows),
    testManagement: transformTestManagementFromBackend(backendConfig.testManagement),
    communication: transformCommunicationFromBackend(backendConfig.communication),
    jiraProject: transformJiraFromBackend(backendConfig.jiraProject),
    scheduling: transformSchedulingFromBackend(backendConfig.scheduling),
    
    // Metadata
    createdAt: backendConfig.createdAt,
    updatedAt: backendConfig.updatedAt,
    isActive: backendConfig.isActive ?? true,
    status: backendConfig.status || 'ACTIVE',
  };

  // Transform platformTargets if present
  if (backendConfig.platformTargets && Array.isArray(backendConfig.platformTargets)) {
    config.targets = transformFromPlatformTargetsArray(backendConfig.platformTargets);
    config.platforms = [...new Set(backendConfig.platformTargets.map((pt: PlatformTarget) => pt.platform))];
  }
  // Fallback to old format if platformTargets not present
  else if (backendConfig.platforms && backendConfig.targets) {
    config.platforms = backendConfig.platforms;
    config.targets = backendConfig.targets;
  }

  return config;
}

/**
 * Transform array of backend configs to UI format
 * Useful for list views
 */
export function transformReleaseConfigsFromBackend(backendConfigs: any[]): ReleaseConfiguration[] {
  if (!backendConfigs || !Array.isArray(backendConfigs)) {
    return [];
  }

  return backendConfigs.map(transformReleaseConfigFromBackend);
}

