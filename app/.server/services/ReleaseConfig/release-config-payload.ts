/**
 * Release Config Payload Preparation
 * MINIMAL transformations - UI sends data in backend-compatible format
 * 
 * Only 4 minimal transformations:
 * 1. Field rename: targets → defaultTargets (backend API inconsistency)
 * 2. Field rename: jiraProject → projectManagement (semantic naming)
 * 3. Case change: WEEKLY → weekly (backend expects lowercase)
 * 4. User ID injection (security - backend needs createdByAccountId)
 */

import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * Prepare release config payload for backend
 * MINIMAL transformation - UI already matches backend structure
 */
export function prepareReleaseConfigPayload(
  config: ReleaseConfiguration,
  userId: string
): any {
  const payload = {
    ...config,
    
    // ========================================================================
    // TRANSFORMATION 1: Field Rename (Backend API Inconsistency)
    // Backend REQUEST expects "defaultTargets", but RESPONSE returns "targets"
    // ========================================================================
    defaultTargets: config.targets,
    targets: undefined, // Remove to avoid confusion
    
    // ========================================================================
    // TRANSFORMATION 2: Scheduling - Lowercase frequency
    // Backend expects "weekly", UI has "WEEKLY"
    // ========================================================================
    ...(config.scheduling && {
      scheduling: {
        ...config.scheduling,
        releaseFrequency: config.scheduling.releaseFrequency.toLowerCase(),
      },
    }),
    
    // ========================================================================
    // TRANSFORMATION 3: User ID Injection (Security)
    // Backend requires createdByAccountId for audit trail
    // ========================================================================
    ...(config.testManagement && {
      testManagement: {
        ...config.testManagement,
        createdByAccountId: userId,
      },
    }),
    
    ...(config.communication && {
      communication: {
        ...config.communication,
        createdByAccountId: userId,
      },
    }),
    
    // ========================================================================
    // TRANSFORMATION 4: Field Rename - jiraProject → projectManagement
    // Frontend uses "jiraProject", backend expects "projectManagement"
    // ========================================================================
    ...(config.jiraProject && {
      projectManagement: {
        ...config.jiraProject,
        createdByAccountId: userId,
      },
    }),
    jiraProject: undefined, // Remove frontend field
  };

  return payload;
}

/**
 * Transform backend response to frontend schema
 * Backend RESPONSE uses "targets" - no transformation needed for most fields
 */
export function transformFromBackend(backendConfig: any): Partial<ReleaseConfiguration> {
  return {
    ...backendConfig,
    // Backend RESPONSE already has "targets" - perfect match with frontend
  };
}

/**
 * Prepare update payload (same as create)
 */
export function prepareUpdatePayload(
  config: Partial<ReleaseConfiguration>,
  userId: string
): any {
  return prepareReleaseConfigPayload(config as ReleaseConfiguration, userId);
}
