/**
 * JIRA Configuration Transformer
 * Transforms between frontend JiraProjectConfig and backend CreateProjectManagementConfigDto
 */

import type { JiraProjectConfig, JiraPlatformConfig, Platform } from '~/types/release-config';
import { PLATFORMS } from '~/types/release-config-constants';
import { JIRA_BACKEND_PARAMS } from '~/constants/release-config-ui';

/**
 * Backend DTO structure (matches server-ota types)
 * 
 * Note: Backend Platform enum only includes ANDROID and IOS.
 * WEB is not a valid platform for project management.
 */
export interface CreateProjectManagementConfigDto {
  projectId: string; // Tenant ID
  integrationId: string; // JIRA integration ID
  name: string; // Config name
  description?: string;
  platformConfigurations: Array<{
    platform: Platform;
    parameters: {
      projectKey: string;
      issueType?: string;
      completedStatus: string;
      priority?: string;
      [key: string]: unknown;
    };
  }>;
  createdByAccountId?: string;
}

/**
 * Backend response structure
 * 
 * Note: Legacy data may contain WEB platforms, but new backend
 * only accepts ANDROID and IOS. Filter defensively when transforming.
 */
export interface ProjectManagementConfigResponse {
  id: string;
  projectId: string;
  integrationId: string;
  name: string;
  description: string | null;
  platformConfigurations: Array<{
    platform: Platform; // WEB only for legacy data compatibility
    parameters: Record<string, unknown>;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform frontend JiraProjectConfig to backend CreateProjectManagementConfigDto
 * 
 * @param jiraConfig - Frontend JIRA configuration
 * @param tenantId - Tenant/Project ID
 * @param configName - Name for the configuration
 * @param userId - User ID creating the config
 * @returns Backend DTO with empty platformConfigurations if disabled, null if not configured
 */
export function transformJiraConfigToBackendDTO(
  jiraConfig: JiraProjectConfig,
  tenantId: string,
  configName: string,
  userId?: string
): CreateProjectManagementConfigDto | null {
  // If JIRA config doesn't exist at all, return null
  if (!jiraConfig) {
    return null;
  }

  // If disabled or no integration selected, return config with empty platformConfigurations
  if (!jiraConfig.enabled || !jiraConfig.integrationId) {
    return {
      projectId: tenantId,
      integrationId: jiraConfig.integrationId || '',
      name: `${configName} - JIRA Config`,
      description: `Project management configuration for ${configName}`,
      platformConfigurations: [], // Empty array when disabled
      createdByAccountId: userId,
    };
  }

  // If no platform configurations, return config with empty array
  if (!jiraConfig.platformConfigurations || jiraConfig.platformConfigurations.length === 0) {
    return {
      projectId: tenantId,
      integrationId: jiraConfig.integrationId,
      name: `${configName} - JIRA Config`,
      description: `Project management configuration for ${configName}`,
      platformConfigurations: [], // Empty array when no configs
      createdByAccountId: userId,
    };
  }

  // Filter out invalid platform configurations (missing required fields)
  const validPlatformConfigs = jiraConfig.platformConfigurations.filter(
    pc => pc.projectKey && pc.projectKey.trim() && pc.completedStatus
  );

  return {
    projectId: tenantId,
    integrationId: jiraConfig.integrationId,
    name: `${configName} - JIRA Config`,
    description: `Project management configuration for ${configName}`,
    platformConfigurations: validPlatformConfigs.map(pc => ({
      platform: pc.platform,
      parameters: {
        [JIRA_BACKEND_PARAMS.PROJECT_KEY]: pc.projectKey,
        [JIRA_BACKEND_PARAMS.ISSUE_TYPE]: pc.issueType,
        [JIRA_BACKEND_PARAMS.COMPLETED_STATUS]: pc.completedStatus,
        [JIRA_BACKEND_PARAMS.PRIORITY]: pc.priority,
      }
    })),
    createdByAccountId: userId,
  };
}

/**
 * Transform backend ProjectManagementConfig to frontend JiraProjectConfig
 * 
 * @param backendConfig - Backend configuration response
 * @returns Frontend JIRA configuration
 * 
 * Note: Filters out 'WEB' platforms as they are not valid in the frontend system.
 * Only ANDROID and IOS are supported platforms.
 */
export function transformBackendDTOToJiraConfig(
  backendConfig: ProjectManagementConfigResponse
): JiraProjectConfig {
  return {
    enabled: backendConfig.isActive,
    integrationId: backendConfig.integrationId,
    platformConfigurations: backendConfig.platformConfigurations
      .filter(pc => pc.platform === PLATFORMS.ANDROID || pc.platform === PLATFORMS.IOS) // Filter out WEB
      .map(pc => ({
        platform: pc.platform as Platform, // Safe cast after filter
        projectKey: (pc.parameters[JIRA_BACKEND_PARAMS.PROJECT_KEY] as string) || '',
        issueType: pc.parameters[JIRA_BACKEND_PARAMS.ISSUE_TYPE] as string | undefined,
        completedStatus: (pc.parameters[JIRA_BACKEND_PARAMS.COMPLETED_STATUS] as string) || 'Done',
        priority: pc.parameters[JIRA_BACKEND_PARAMS.PRIORITY] as string | undefined,
      })),
    createReleaseTicket: true,
    linkBuildsToIssues: true,
  };
}

/**
 * Create default JIRA platform configurations based on selected platforms
 * 
 * @param platforms - Selected platforms (ANDROID | IOS from system)
 * @returns Array of default platform configurations
 */
export function createDefaultPlatformConfigs(platforms: Platform[]): JiraPlatformConfig[] {
  return platforms.map(platform => ({
    platform, // Use system platforms directly (ANDROID | IOS)
    projectKey: '',
    completedStatus: 'Done', // Default completion status
    priority: 'High', // Default priority
  }));
}

/**
 * Validate JIRA platform configuration
 * 
 * @param config - Platform configuration to validate
 * @returns Validation result with error message if invalid
 */
export function validatePlatformConfig(config: JiraPlatformConfig): { valid: boolean; error?: string } {
  if (!config.projectKey || !config.projectKey.trim()) {
    return { valid: false, error: 'Project key is required' };
  }

  if (!config.completedStatus || !config.completedStatus.trim()) {
    return { valid: false, error: 'Completion status is required' };
  }

  // Project key should be uppercase alphanumeric (JIRA convention)
  const projectKeyRegex = /^[A-Z][A-Z0-9]*$/;
  if (!projectKeyRegex.test(config.projectKey)) {
    return { valid: false, error: 'Project key must be uppercase letters and numbers (e.g., APP, FE, MOBILE)' };
  }

  return { valid: true };
}

/**
 * Validate complete JIRA project configuration
 * 
 * @param config - JIRA project configuration
 * @returns Validation result
 */
export function validateJiraProjectConfig(config: JiraProjectConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.enabled) {
    return { valid: true, errors: [] }; // Valid if disabled
  }

  if (!config.integrationId) {
    errors.push('JIRA integration must be selected');
  }

  if (!config.platformConfigurations || config.platformConfigurations.length === 0) {
    errors.push('At least one platform configuration is required');
  } else {
    // Validate each platform configuration
    config.platformConfigurations.forEach((pc, index) => {
      const validation = validatePlatformConfig(pc);
      if (!validation.valid && validation.error) {
        errors.push(`${pc.platform}: ${validation.error}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

