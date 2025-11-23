/**
 * Release Config Transformer
 * Transforms frontend ReleaseConfiguration to backend API contract and vice versa
 */

import { targetToTestPlatform, getPlatformForTarget } from '~/utils/platform-mapper';
import type { ReleaseConfiguration, TargetPlatform, Platform } from '~/types/release-config';

// ============================================================================
// BACKEND API TYPES (from CREATE_RELEASE_CONFIG_API_CONTRACT.md)
// ============================================================================

export interface BackendWorkflow {
  id: string;
  tenantId: string;
  providerType: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI';
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: Record<string, unknown>;
  platform: string;
  workflowType: 'PRE_REGRESSION_BUILD' | 'REGRESSION_BUILD' | 'TEST_FLIGHT_BUILD' | 'AUTOMATION_BUILD' | 'CUSTOM';
  parameters?: Record<string, unknown>;
  createdByAccountId: string;
}

export interface BackendTestManagementConfig {
  tenantId: string;
  integrationId: string;
  name: string;
  passThresholdPercent: number;
  platformConfigurations: BackendTestPlatformConfiguration[];
  createdByAccountId: string;
}

export interface BackendTestPlatformConfiguration {
  platform: 'IOS_APP_STORE' | 'ANDROID_PLAY_STORE' | 'IOS_TESTFLIGHT' | 'ANDROID_INTERNAL_TESTING';
  parameters: {
    sectionIds?: number[];
    labelIds?: number[];
    squadIds?: number[];
    autoCreateRuns?: boolean;
    filterType?: 'AND' | 'OR';
    [key: string]: unknown;
  };
}

export interface BackendCommunicationConfig {
  tenantId: string;
  channelData: {
    [stageName: string]: Array<{ id: string; name: string }>;
  };
}

export interface BackendProjectManagementConfig {
  tenantId: string;
  integrationId: string;
  name: string;
  description?: string;
  platformConfigurations: BackendProjectPlatformConfiguration[];
  createdByAccountId: string;
}

export interface BackendProjectPlatformConfiguration {
  platform: string;
  parameters: {
    projectKey: string;
    issueType?: string;
    completedStatus: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
    customFields?: Record<string, string>;
    [key: string]: unknown;
  };
}

export interface BackendRegressionSlot {
  name?: string;
  regressionSlotOffsetFromKickoff: number;
  time: string;
  config: {
    regressionBuilds: boolean;
    postReleaseNotes: boolean;
    automationBuilds: boolean;
    automationRuns: boolean;
  };
}

export interface BackendReleaseScheduling {
  releaseFrequency: 'weekly' | 'biweekly' | 'triweekly' | 'monthly';
  firstReleaseKickoffDate: string;
  nextReleaseKickoffDate?: string;
  initialVersions: Record<string, string>;
  kickoffReminderTime: string;
  kickoffTime: string;
  targetReleaseTime: string;
  targetReleaseDateOffsetFromKickoff: number;
  kickoffReminderEnabled: boolean;
  timezone: string;
  regressionSlots?: BackendRegressionSlot[];
  workingDays: number[];
}

export interface CreateReleaseConfigRequest {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  isDefault?: boolean;
  platforms?: string[];
  defaultTargets: string[];
  baseBranch?: string;
  workflows?: BackendWorkflow[];
  testManagement?: BackendTestManagementConfig;
  communication?: BackendCommunicationConfig;
  projectManagement?: BackendProjectManagementConfig;
  scheduling?: BackendReleaseScheduling;
}

export interface SafeReleaseConfiguration {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets: string[];
  platforms: string[] | null;
  baseBranch: string | null;
  isActive: boolean;
  isDefault: boolean;
  scheduling: BackendReleaseScheduling | null;
  createdBy: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID (shortid-compatible)
 */
function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract unique platforms from targets
 */
function getUniquePlatforms(targets: TargetPlatform[]): Platform[] {
  return [...new Set(targets.map(getPlatformForTarget))];
}

/**
 * Convert frontend release frequency to backend format
 */
function transformReleaseFrequency(frequency: string): 'weekly' | 'biweekly' | 'triweekly' | 'monthly' {
  const lowerFreq = frequency.toLowerCase();
  if (lowerFreq === 'weekly' || lowerFreq === 'biweekly' || lowerFreq === 'triweekly' || lowerFreq === 'monthly') {
    return lowerFreq;
  }
  return 'weekly'; // Default fallback
}

/**
 * Convert working days to backend format
 * Handles both string day names and numbers
 * Monday = 1, Sunday = 7
 */
function transformWorkingDays(days?: (string | number)[]): number[] {
  if (!days || days.length === 0) {
    return [1, 2, 3, 4, 5]; // Default: weekdays
  }

  // If already numbers, return them (after validation)
  if (typeof days[0] === 'number') {
    return (days as number[]).filter(d => d >= 1 && d <= 7);
  }

  // Otherwise, convert from day names to numbers
  const dayMap: Record<string, number> = {
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6,
    'SUNDAY': 7,
  };

  return (days as string[])
    .map(day => typeof day === 'string' ? dayMap[day.toUpperCase()] || 1 : day)
    .filter(d => d >= 1 && d <= 7);
}

/**
 * Transform regression slots from frontend to backend format
 */
function transformRegressionSlots(
  slots?: Array<{
    regressionSlotOffsetFromKickoff: number;
    regressionBuilds: string[];
    time?: string;
    name?: string;
  }>
): BackendRegressionSlot[] {
  if (!slots || slots.length === 0) return [];

  return slots.map(slot => ({
    name: slot.name,
    regressionSlotOffsetFromKickoff: slot.regressionSlotOffsetFromKickoff,
    time: slot.time || '14:00', // Default time if not provided
    config: {
      regressionBuilds: slot.regressionBuilds?.includes('REGRESSION_BUILD') || false,
      postReleaseNotes: slot.regressionBuilds?.includes('POST_RELEASE_NOTES') || false,
      automationBuilds: slot.regressionBuilds?.includes('AUTOMATION_BUILD') || false,
      automationRuns: slot.regressionBuilds?.includes('AUTOMATION_RUN') || false,
    },
  }));
}

// ============================================================================
// MAIN TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform frontend ReleaseConfiguration to backend CreateReleaseConfigRequest
 * 
 * @param config - Frontend ReleaseConfiguration
 * @param userId - Current user's account ID
 * @returns Backend CreateReleaseConfigRequest payload
 */
export function transformToBackendPayload(
  config: ReleaseConfiguration,
  userId: string
): CreateReleaseConfigRequest {
  const payload: CreateReleaseConfigRequest = {
    // Basic fields
    tenantId: config.organizationId,
    name: config.name,
    description: config.description,
    releaseType: config.releaseType,
    isDefault: config.isDefault ?? false,
    platforms: getUniquePlatforms(config.defaultTargets), // Extract unique platforms
    defaultTargets: config.defaultTargets,
    baseBranch: config.baseBranch,
  };

  // Transform Workflows (CI/CD)
  if (config.workflows && config.workflows.length > 0) {
    payload.workflows = config.workflows.map(w => ({
      id: w.id || generateId(),
      tenantId: config.organizationId,
      providerType: w.provider as any, // Cast to backend provider type
      integrationId: w.integrationId,
      displayName: w.name,
      workflowUrl: w.url || '',
      providerIdentifiers: w.providerIdentifiers,
      platform: w.platform, // Simple ANDROID/IOS (no transformation)
      workflowType: w.type as any,
      parameters: w.config,
      createdByAccountId: userId,
    }));
  }

  // Transform Test Management
  if (config.testManagement?.enabled && config.testManagement.integrationId) {
    payload.testManagement = {
      tenantId: config.organizationId,
      integrationId: config.testManagement.integrationId,
      name: config.testManagement.name || `TCM Config for ${config.name}`,
      passThresholdPercent: config.testManagement.passThresholdPercent ?? 100,
      platformConfigurations: (config.testManagement.platformConfigurations || []).map(pc => {
        // Find the corresponding target to get the correct TestPlatform enum
        const matchingTarget = config.defaultTargets.find(
          target => getPlatformForTarget(target) === pc.platform
        );

        return {
          platform: matchingTarget 
            ? targetToTestPlatform(matchingTarget) 
            : (pc.platform === 'ANDROID' ? 'ANDROID_PLAY_STORE' : 'IOS_APP_STORE'),
          parameters: {
            sectionIds: pc.sectionIds || [],
            labelIds: pc.labelIds || [],
            squadIds: pc.squadIds || [],
            autoCreateRuns: true,
            filterType: 'AND' as const,
          },
        };
      }),
      createdByAccountId: userId,
    };
  }

  // Transform Communication (Slack)
  if (config.communication?.enabled && config.communication.slack?.channels) {
    payload.communication = {
      tenantId: config.organizationId,
      channelData: config.communication.slack.channels,
    };
  }

  // Transform Project Management (JIRA)
  if (config.jiraProject?.enabled && config.jiraProject.integrationId) {
    payload.projectManagement = {
      tenantId: config.organizationId,
      integrationId: config.jiraProject.integrationId,
      name: config.jiraProject.name || `PM Config for ${config.name}`,
      description: config.jiraProject.description || config.description || '',
      platformConfigurations: (config.jiraProject.platformConfigurations || []).map(pc => ({
        platform: pc.platform, // Simple ANDROID/IOS (no transformation for JIRA)
        parameters: {
          projectKey: pc.parameters.projectKey,
          issueType: pc.parameters.issueType,
          completedStatus: pc.parameters.completedStatus,
          priority: pc.parameters.priority,
          labels: pc.parameters.labels,
          assignee: pc.parameters.assignee,
          customFields: pc.parameters.customFields,
        },
      })),
      createdByAccountId: userId,
    };
  }

  // Transform Scheduling
  if (config.scheduling) {
    payload.scheduling = {
      releaseFrequency: transformReleaseFrequency(config.scheduling.releaseFrequency),
      firstReleaseKickoffDate: config.scheduling.firstReleaseKickoffDate,
      nextReleaseKickoffDate: config.scheduling.nextReleaseKickoffDate,
      initialVersions: config.scheduling.initialVersions as Record<string, string>,
      kickoffReminderTime: config.scheduling.kickoffReminderTime,
      kickoffTime: config.scheduling.kickoffTime,
      targetReleaseTime: config.scheduling.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: config.scheduling.targetReleaseDateOffsetFromKickoff,
      kickoffReminderEnabled: config.scheduling.kickoffReminderEnabled,
      timezone: config.scheduling.timezone,
      regressionSlots: transformRegressionSlots(config.scheduling.regressionSlots),
      workingDays: transformWorkingDays(config.scheduling.workingDays),
    };
  }

  return payload;
}

/**
 * Transform backend SafeReleaseConfiguration to frontend ReleaseConfiguration
 * (Partial transform - only metadata is returned from backend)
 * 
 * @param backendConfig - Backend SafeReleaseConfiguration
 * @returns Partial frontend ReleaseConfiguration
 */
export function transformFromBackendResponse(
  backendConfig: SafeReleaseConfiguration
): Partial<ReleaseConfiguration> {
  return {
    id: backendConfig.id,
    organizationId: backendConfig.tenantId,
    name: backendConfig.name,
    description: backendConfig.description || '',
    releaseType: backendConfig.releaseType,
    defaultTargets: backendConfig.targets as TargetPlatform[],
    platforms: backendConfig.platforms as Platform[] | undefined,
    baseBranch: backendConfig.baseBranch || undefined,
    isDefault: backendConfig.isDefault,
    isActive: backendConfig.isActive,
    scheduling: backendConfig.scheduling ? {
      ...backendConfig.scheduling,
      releaseFrequency: backendConfig.scheduling.releaseFrequency.toUpperCase() as any,
      workingDays: backendConfig.scheduling.workingDays, // Already numbers (1-7), keep as is
      regressionSlots: backendConfig.scheduling.regressionSlots?.map(slot => ({
        name: slot.name,
        regressionSlotOffsetFromKickoff: slot.regressionSlotOffsetFromKickoff,
        time: slot.time,
        regressionBuilds: [
          slot.config.regressionBuilds && 'REGRESSION_BUILD',
          slot.config.postReleaseNotes && 'POST_RELEASE_NOTES',
          slot.config.automationBuilds && 'AUTOMATION_BUILD',
          slot.config.automationRuns && 'AUTOMATION_RUN',
        ].filter(Boolean) as string[],
      })),
    } : undefined,
    createdAt: backendConfig.createdAt,
    updatedAt: backendConfig.updatedAt,
    createdBy: backendConfig.createdBy,
  };
}

/**
 * Transform for update payload (similar to create but allows partial updates)
 */
export function transformToUpdatePayload(
  config: Partial<ReleaseConfiguration>,
  userId: string
): Partial<CreateReleaseConfigRequest> {
  const updatePayload: Partial<CreateReleaseConfigRequest> = {};

  if (config.name !== undefined) updatePayload.name = config.name;
  if (config.description !== undefined) updatePayload.description = config.description;
  if (config.releaseType !== undefined) updatePayload.releaseType = config.releaseType;
  if (config.isDefault !== undefined) updatePayload.isDefault = config.isDefault;
  if (config.baseBranch !== undefined) updatePayload.baseBranch = config.baseBranch;
  
  if (config.defaultTargets !== undefined) {
    updatePayload.defaultTargets = config.defaultTargets;
    updatePayload.platforms = getUniquePlatforms(config.defaultTargets);
  }

  // Include other integration updates if provided
  // (Similar to create transform but conditional)

  return updatePayload;
}

