/**
 * Release Config Payload Preparation
 * Maps frontend schema to backend API contract
 * 
 * Important: Backend has DIFFERENT field names for request vs response
 * - REQUEST uses: defaultTargets, projectManagement, etc.
 * - RESPONSE uses: targets, projectManagement, etc.
 */

import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * Prepare release config payload matching backend API contract
 * See: CREATE_RELEASE_CONFIG_API_CONTRACT.md
 */
export function prepareReleaseConfigPayload(
  config: ReleaseConfiguration,
  userId: string
): any {
  const payload: any = {
    // ========================================================================
    // BASIC CONFIGURATION (Required)
    // ========================================================================
    tenantId: config.tenantId,
    name: config.name,
    releaseType: config.releaseType,
    defaultTargets: config.targets, // ⚠️ Backend REQUEST expects "defaultTargets", RESPONSE returns "targets"
    
    // ========================================================================
    // OPTIONAL BASIC FIELDS
    // ========================================================================
    ...(config.description && { description: config.description }),
    ...(config.isDefault !== undefined && { isDefault: config.isDefault }),
    ...(config.platforms && config.platforms.length > 0 && { platforms: config.platforms }),
    ...(config.baseBranch && { baseBranch: config.baseBranch }),
  };

  // ========================================================================
  // TEST MANAGEMENT (Optional)
  // ========================================================================
  if (config.testManagement?.enabled && config.testManagement.integrationId) {
    payload.testManagement = {
      tenantId: config.tenantId,
      integrationId: config.testManagement.integrationId,
      name: `Test Management Config for ${config.name}`,
      passThresholdPercent: 100, // Default
      platformConfigurations: (config.testManagement.providerConfig as any)?.platformConfigurations || [],
      createdByAccountId: userId,
    };
  }

  // ========================================================================
  // COMMUNICATION (Optional)
  // ========================================================================
  if (config.communication?.slack?.enabled && config.communication.slack.channelData) {
    payload.communication = {
      tenantId: config.tenantId,
      channelData: config.communication.slack.channelData,
    };
  }

  // ========================================================================
  // PROJECT MANAGEMENT (Optional)
  // ========================================================================
  if (config.jiraProject?.enabled && config.jiraProject.integrationId) {
    payload.projectManagement = {
      tenantId: config.tenantId,
      integrationId: config.jiraProject.integrationId,
      name: `Project Management Config for ${config.name}`,
      description: config.description || '',
      platformConfigurations: config.jiraProject.platformConfigurations || [],
      createdByAccountId: userId,
    };
  }

  // ========================================================================
  // SCHEDULING (Optional - but if present, all fields required)
  // ========================================================================
  if (config.scheduling) {
    payload.scheduling = {
      releaseFrequency: config.scheduling.releaseFrequency.toLowerCase(), // "WEEKLY" -> "weekly"
      firstReleaseKickoffDate: config.scheduling.firstReleaseKickoffDate,
      initialVersions: config.scheduling.initialVersions || {},
      kickoffTime: config.scheduling.kickoffTime,
      kickoffReminderEnabled: config.scheduling.kickoffReminderEnabled,
      kickoffReminderTime: config.scheduling.kickoffReminderTime,
      targetReleaseTime: config.scheduling.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: config.scheduling.targetReleaseDateOffsetFromKickoff,
      workingDays: config.scheduling.workingDays,
      timezone: config.scheduling.timezone,
      ...(config.scheduling.regressionSlots && config.scheduling.regressionSlots.length > 0 && {
        regressionSlots: config.scheduling.regressionSlots.map(slot => ({
          ...(slot.name && { name: slot.name }),
          regressionSlotOffsetFromKickoff: slot.regressionSlotOffsetFromKickoff,
          time: slot.time,
          config: slot.config,
        })),
      }),
    };
  }

  return payload;
}

/**
 * Transform backend response to frontend schema
 * Backend RESPONSE uses "targets", frontend uses "targets" too
 */
export function transformFromBackend(backendConfig: any): Partial<ReleaseConfiguration> {
  return {
    id: backendConfig.id,
    tenantId: backendConfig.tenantId,
    name: backendConfig.name,
    description: backendConfig.description,
    releaseType: backendConfig.releaseType,
    isDefault: backendConfig.isDefault,
    targets: backendConfig.targets, // Backend RESPONSE uses "targets"
    platforms: backendConfig.platforms,
    baseBranch: backendConfig.baseBranch,
    scheduling: backendConfig.scheduling,
    // Note: Backend doesn't return full integration configs, only metadata
    createdAt: backendConfig.createdAt,
    updatedAt: backendConfig.updatedAt,
  };
}

/**
 * Prepare update payload
 */
export function prepareUpdatePayload(
  config: Partial<ReleaseConfiguration>,
  userId: string
): any {
  return prepareReleaseConfigPayload(config as ReleaseConfiguration, userId);
}
