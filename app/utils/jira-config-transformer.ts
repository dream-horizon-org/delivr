/**
 * JIRA Configuration Transformer
 * Transforms between frontend JiraProjectConfig and backend CreateProjectManagementConfigDto
 */

import type { JiraProjectConfig, JiraPlatformConfig, Platform } from '~/types/release-config';

/**
 * Backend DTO structure (matches server-ota types)
 */
export interface CreateProjectManagementConfigDto {
  projectId: string; // Tenant ID
  integrationId: string; // JIRA integration ID
  name: string; // Config name
  description?: string;
  platformConfigurations: Array<{
    platform: 'WEB' | 'IOS' | 'ANDROID';
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
 */
export interface ProjectManagementConfigResponse {
  id: string;
  projectId: string;
  integrationId: string;
  name: string;
  description: string | null;
  platformConfigurations: Array<{
    platform: 'WEB' | 'IOS' | 'ANDROID';
    parameters: Record<string, unknown>;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map frontend Platform to backend Platform
 */
function mapPlatform(platform: Platform): 'WEB' | 'IOS' | 'ANDROID' {
  // Frontend uses 'ANDROID' | 'IOS'
  // Backend uses 'WEB' | 'IOS' | 'ANDROID'
  if (platform === 'ANDROID') return 'ANDROID';
  if (platform === 'IOS') return 'IOS';
  return 'WEB'; // Fallback
}

/**
 * Transform frontend JiraProjectConfig to backend CreateProjectManagementConfigDto
 * 
 * @param jiraConfig - Frontend JIRA configuration
 * @param tenantId - Tenant/Project ID
 * @param configName - Name for the configuration
 * @param userId - User ID creating the config
 * @returns Backend DTO or null if config is disabled
 */
export function transformJiraConfigToBackendDTO(
  jiraConfig: JiraProjectConfig,
  tenantId: string,
  configName: string,
  userId?: string
): CreateProjectManagementConfigDto | null {
  // Don't create config if JIRA is disabled or no integration selected
  if (!jiraConfig.enabled || !jiraConfig.integrationId) {
    return null;
  }

  // Don't create config if no platform configurations
  if (!jiraConfig.platformConfigurations || jiraConfig.platformConfigurations.length === 0) {
    return null;
  }

  // Filter out invalid platform configurations (missing required fields)
  const validPlatformConfigs = jiraConfig.platformConfigurations.filter(
    pc => pc.projectKey && pc.projectKey.trim() && pc.completedStatus
  );

  if (validPlatformConfigs.length === 0) {
    return null;
  }

  return {
    projectId: tenantId,
    integrationId: jiraConfig.integrationId,
    name: `${configName} - JIRA Config`,
    description: `Project management configuration for ${configName}`,
    platformConfigurations: validPlatformConfigs.map(pc => ({
      platform: pc.platform,
      parameters: {
        projectKey: pc.projectKey,
        issueType: pc.issueType,
        completedStatus: pc.completedStatus,
        priority: pc.priority,
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
 */
export function transformBackendDTOToJiraConfig(
  backendConfig: ProjectManagementConfigResponse
): JiraProjectConfig {
  return {
    enabled: backendConfig.isActive,
    integrationId: backendConfig.integrationId,
    platformConfigurations: backendConfig.platformConfigurations.map(pc => ({
      platform: pc.platform,
      projectKey: (pc.parameters.projectKey as string) || '',
      issueType: pc.parameters.issueType as string | undefined,
      completedStatus: (pc.parameters.completedStatus as string) || 'Done',
      priority: pc.parameters.priority as string | undefined,
    })),
    createReleaseTicket: true,
    linkBuildsToIssues: true,
  };
}

/**
 * Create default JIRA platform configurations based on selected platforms
 * 
 * @param platforms - Selected platforms (from earlier wizard step)
 * @returns Array of default platform configurations
 */
export function createDefaultPlatformConfigs(platforms: Platform[]): JiraPlatformConfig[] {
  return platforms.map(platform => ({
    platform: mapPlatform(platform),
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

