/**
 * Workflow Type Mappings
 * Maps between backend WorkflowType and frontend BuildEnvironment
 */

import { BUILD_ENVIRONMENTS, PLATFORMS } from './release-config-constants';
import type { BuildEnvironment, Platform } from './release-config';

/**
 * Map backend WorkflowType to UI BuildEnvironment
 * Note: System only supports PRE_REGRESSION, REGRESSION, and TESTFLIGHT (iOS only)
 */
export const workflowTypeToEnvironment: Record<string, BuildEnvironment> = {
  PRE_REGRESSION_BUILD: BUILD_ENVIRONMENTS.PRE_REGRESSION,
  REGRESSION_BUILD: BUILD_ENVIRONMENTS.REGRESSION,
  TEST_FLIGHT_BUILD: BUILD_ENVIRONMENTS.TESTFLIGHT,
} as const;

/**
 * Map UI BuildEnvironment to backend WorkflowType
 * Note: System only supports PRE_REGRESSION, REGRESSION, and TESTFLIGHT (iOS only)
 */
export const environmentToWorkflowType: Record<string, string> = {
  [BUILD_ENVIRONMENTS.PRE_REGRESSION]: 'PRE_REGRESSION_BUILD',
  [BUILD_ENVIRONMENTS.REGRESSION]: 'REGRESSION_BUILD',
  [BUILD_ENVIRONMENTS.TESTFLIGHT]: 'TEST_FLIGHT_BUILD',
} as const;

/**
 * Platform to Environment Mapping
 * Defines which build environments are available for each platform
 * 
 * This mapping is extensible - add new platforms and environments here as the system grows.
 * 
 * Current support:
 * - ANDROID: PRE_REGRESSION, REGRESSION
 * - IOS: PRE_REGRESSION, REGRESSION, TESTFLIGHT
 */
export const platformToEnvironments: Record<Platform, readonly BuildEnvironment[]> = {
  [PLATFORMS.ANDROID]: [
    BUILD_ENVIRONMENTS.PRE_REGRESSION,
    BUILD_ENVIRONMENTS.REGRESSION,
  ] as const,
  [PLATFORMS.IOS]: [
    BUILD_ENVIRONMENTS.PRE_REGRESSION,
    BUILD_ENVIRONMENTS.REGRESSION,
    BUILD_ENVIRONMENTS.TESTFLIGHT,
  ] as const,
} as const;

/**
 * Get available environments for a platform
 * @param platform - The platform to get environments for
 * @returns Array of available build environments for the platform
 */
export function getEnvironmentsForPlatform(platform: Platform): readonly BuildEnvironment[] {
  return platformToEnvironments[platform] || [];
}

/**
 * Check if an environment is valid for a platform
 * @param platform - The platform to check
 * @param environment - The environment to validate
 * @returns true if the environment is valid for the platform
 */
export function isEnvironmentValidForPlatform(platform: Platform, environment: BuildEnvironment): boolean {
  return platformToEnvironments[platform]?.includes(environment) ?? false;
}

