/**
 * Release Config Payload Preparation
 * SIMPLIFIED - Only handles truly necessary transformations
 * 
 * Philosophy: UI schema matches backend schema as much as possible
 * Only transform what's ACTUALLY different between UI and backend
 */

import type { ReleaseConfiguration, RegressionSlot, TargetPlatform } from '~/types/release-config';
import { targetToTestPlatform } from '~/utils/platform-mapper';
import * as shortid from 'shortid';

/**
 * Prepare release config payload for backend
 * MINIMAL transformations - only what's truly necessary
 */
export function prepareReleaseConfigPayload(
  config: ReleaseConfiguration,
  userId: string
): any {
  const payload: any = {
    // ========================================================================
    // DIRECT PASS-THROUGH (No transformation needed!)
    // ========================================================================
    tenantId: config.tenantId,
    name: config.name,
    description: config.description,
    releaseType: config.releaseType,
    isDefault: config.isDefault ?? false,
    targets: config.targets,
    baseBranch: config.baseBranch,
    scheduling: config.scheduling, // Direct pass-through (backend handles as JSON)
    
    // ========================================================================
    // DERIVED FIELDS (Backend needs these for indexing/querying)
    // ========================================================================
    platforms: extractPlatforms(config.targets),
  };

  // ========================================================================
  // WORKFLOWS - Minimal transformation (add IDs + userId)
  // ========================================================================
  if (config.workflows && config.workflows.length > 0) {
    payload.workflows = config.workflows.map(w => ({
      id: w.id || shortid.generate(),
      tenantId: config.tenantId,
      providerType: w.provider,
      integrationId: w.integrationId,
      displayName: w.name,
      workflowUrl: w.url || '',
      providerIdentifiers: w.providerIdentifiers,
      platform: w.platform,
      workflowType: w.type,
      parameters: w.config,
      createdByAccountId: userId,
    }));
  }

  // ========================================================================
  // TEST MANAGEMENT - NECESSARY transformation (platform mapping)
  // ========================================================================
  if (config.testManagement?.enabled && config.testManagement.integrationId) {
    payload.testManagement = {
      tenantId: config.tenantId,
      integrationId: config.testManagement.integrationId,
      name: config.testManagement.name || `TCM Config for ${config.name}`,
      passThresholdPercent: config.testManagement.passThresholdPercent ?? 100,
      platformConfigurations: (config.testManagement.platformConfigurations || []).map(pc => {
        // NECESSARY TRANSFORMATION: UI uses simple platform (ANDROID/IOS)
        // Backend needs specific TestPlatform enum (ANDROID_PLAY_STORE, IOS_APP_STORE)
        const matchingTarget = config.targets.find(
          target => getPlatformFromTarget(target) === pc.platform
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

  // ========================================================================
  // COMMUNICATION - Direct pass-through
  // ========================================================================
  if (config.communication?.enabled && config.communication.slack?.channels) {
    payload.communication = {
      tenantId: config.tenantId,
      channelData: config.communication.slack.channels,
    };
  }

  // ========================================================================
  // PROJECT MANAGEMENT - Direct pass-through
  // ========================================================================
  if (config.jiraProject?.enabled && config.jiraProject.integrationId) {
    payload.projectManagement = {
      tenantId: config.tenantId,
      integrationId: config.jiraProject.integrationId,
      name: config.jiraProject.name || `PM Config for ${config.name}`,
      description: config.jiraProject.description || config.description || '',
      platformConfigurations: (config.jiraProject.platformConfigurations || []).map(pc => ({
        platform: pc.platform,
        parameters: pc.parameters,
      })),
      createdByAccountId: userId,
    };
  }

  return payload;
}

/**
 * Extract unique platforms from targets
 * e.g., [PLAY_STORE, TESTFLIGHT, APP_STORE] → [ANDROID, IOS]
 */
function extractPlatforms(targets: TargetPlatform[]): string[] {
  const platforms = new Set<string>();
  
  targets.forEach(target => {
    const platform = getPlatformFromTarget(target);
    if (platform) {
      platforms.add(platform);
    }
  });
  
  return Array.from(platforms);
}

/**
 * Get platform from target
 */
function getPlatformFromTarget(target: TargetPlatform): 'ANDROID' | 'IOS' | null {
  const androidTargets = ['PLAY_STORE', 'INTERNAL_TESTING', 'FIREBASE'];
  const iosTargets = ['APP_STORE', 'TESTFLIGHT'];
  
  if (androidTargets.includes(target)) return 'ANDROID';
  if (iosTargets.includes(target)) return 'IOS';
  return null;
}

/**
 * Prepare update payload (similar to create but allows partial updates)
 */
export function prepareUpdatePayload(
  config: Partial<ReleaseConfiguration>,
  userId: string
): any {
  // For updates, just prepare the full payload with provided fields
  // Backend will handle partial updates
  return prepareReleaseConfigPayload(config as ReleaseConfiguration, userId);
}

