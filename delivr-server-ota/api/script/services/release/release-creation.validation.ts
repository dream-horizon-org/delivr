/**
 * Release Creation Service Layer Validations
 * 
 * Validates business rules and data integrity before creating releases.
 * These are service-layer validations that go beyond simple request format validation.
 */

import { ReleaseVersionService } from './release-version.service';
import type { CreateReleasePayload, Platform, Target } from '~types/release';
import type { ReleaseConfiguration, VerboseReleaseConfiguration } from '~types/release-configs';
import { WorkflowType } from '~types/integrations/ci-cd/workflow.interface';
import { normalizePlatform } from '~services/integrations/ci-cd/utils/cicd.utils';

/**
 * Validation result interface
 */
export type ServiceValidationResult = {
  isValid: boolean;
  error?: string;
};

/**
 * Validates that the release config exists, belongs to the tenant, and is active.
 * This is a synchronous validation that operates on an already-fetched config.
 * 
 * @param config - The release config fetched from database (null if not found)
 * @param payload - The create release payload containing appId and releaseConfigId
 */
export const validateReleaseConfigExists = (
  config: ReleaseConfiguration | null,
  payload: CreateReleasePayload
): ServiceValidationResult => {
  // Check if release config exists
  if (!config) {
    return {
      isValid: false,
      error: `Release config with ID '${payload.releaseConfigId}' not found`
    };
  }

  // Check if release config belongs to the tenant (security check)
  const belongsToTenant = config.appId === payload.appId;
  if (!belongsToTenant) {
    return {
      isValid: false,
      error: `Release config '${payload.releaseConfigId}' does not belong to tenant '${payload.appId}'`
    };
  }

  // Check if release config is active (business rule check)
  if (!config.isActive) {
    return {
      isValid: false,
      error: `Release config '${payload.releaseConfigId}' is not active`
    };
  }

  return { isValid: true };
};

/**
 * Validates that all platform-target combinations in the payload are a subset
 * of the platform-targets defined in the release config.
 * 
 * @param config - The release config with allowed platformTargets
 * @param payload - The create release payload with requested platformTargets
 */
export const validatePlatformTargetsSubset = (
  config: ReleaseConfiguration,
  payload: CreateReleasePayload
): ServiceValidationResult => {
  // Build a Set of allowed "platform:target" combinations from config
  const allowedCombinations = new Set(
    config.platformTargets.map(pt => `${pt.platform}:${pt.target}`)
  );

  // Check each requested platform-target is allowed
  const invalidPlatformTargets: string[] = [];
  
  for (const pt of payload.platformTargets) {
    const key = `${pt.platform}:${pt.target}`;
    const isAllowed = allowedCombinations.has(key);
    
    if (!isAllowed) {
      invalidPlatformTargets.push(`${pt.platform}/${pt.target}`);
    }
  }

  const hasInvalidTargets = invalidPlatformTargets.length > 0;
  if (hasInvalidTargets) {
    return {
      isValid: false,
      error: `Platform-target combinations not allowed by release config: ${invalidPlatformTargets.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Validates base release exists for hotfix releases
 */
export const validateBaseRelease = async (
  payload: CreateReleasePayload,
  releaseRepo: any
): Promise<ServiceValidationResult> => {
  // Only validate for HOTFIX releases that specify a baseReleaseId
  if (payload.type !== 'HOTFIX' || !payload.baseReleaseId) {
    return { isValid: true };
  }

  const baseRelease = await releaseRepo.findByBaseReleaseId(payload.baseReleaseId, payload.appId);
  
  if (!baseRelease) {
    return {
      isValid: false,
      error: `Base release with ID '${payload.baseReleaseId}' not found for tenant '${payload.appId}'`
    };
  }

  return { isValid: true };
};

/**
 * Validates that versions for all platform-target combinations are valid
 * for the given release type.
 * 
 * Rules:
 * - MAJOR: version must have major > latest.major
 * - MINOR: version must have same major, minor > latest.minor
 * - HOTFIX: version must have same major.minor, patch > latest.patch
 * - First release for a PT combo: any valid semver is OK
 */
export const validateVersions = async (
  payload: CreateReleasePayload,
  releaseVersionService: ReleaseVersionService
): Promise<ServiceValidationResult> => {
  const errors: string[] = [];

  for (const pt of payload.platformTargets) {
    const result = await releaseVersionService.validateVersion(
      payload.appId,
      pt.platform as Platform,
      pt.target as Target,
      pt.version,
      payload.type
    );

    const isInvalid = !result.valid;
    if (isInvalid) {
      errors.push(`${pt.platform}/${pt.target}: ${result.error}`);
    }
  }

  const hasErrors = errors.length > 0;
  if (hasErrors) {
    return {
      isValid: false,
      error: `Version validation failed:\n${errors.join('\n')}`
    };
  }

  return { isValid: true };
};

/**
 * Master validation function that runs all service-layer validations.
 * 
 * Accepts a pre-fetched release config to avoid redundant database calls.
 */
export const validateReleaseCreation = async (
  payload: CreateReleasePayload,
  releaseConfig: ReleaseConfiguration | null,
  releaseRepo: any,
  releaseVersionService: ReleaseVersionService
): Promise<ServiceValidationResult> => {
  // === Config-based validations (only if releaseConfigId is provided) ===
  const hasReleaseConfig = Boolean(payload.releaseConfigId);
  
  if (hasReleaseConfig) {
    // Validate config exists and is valid
    const configValidation = validateReleaseConfigExists(releaseConfig, payload);
    if (!configValidation.isValid) {
      return configValidation;
    }
    
    // Validate platform-targets are subset of config's allowed combinations
    // Note: releaseConfig is guaranteed to be non-null here due to validateReleaseConfigExists
    const platformTargetsValidation = validatePlatformTargetsSubset(releaseConfig!, payload);
    if (!platformTargetsValidation.isValid) {
      return platformTargetsValidation;
    }
  }

  // === Non-config validations ===
  
  // Validate regression slots
  const slotsValidation = validateRegressionSlots(payload);
  if (!slotsValidation.isValid) {
    return slotsValidation;
  }
  
  // Validate base release for hotfixes
  const baseReleaseValidation = await validateBaseRelease(payload, releaseRepo);
  if (!baseReleaseValidation.isValid) {
    return baseReleaseValidation;
  }

  // Validate versions
  const versionsValidation = await validateVersions(payload, releaseVersionService);
  if (!versionsValidation.isValid) {
    return versionsValidation;
  }

  return { isValid: true };
};

/**
 * Validates that at least one regression slot is provided
 */
export const validateRegressionSlots = (
  payload: CreateReleasePayload
): ServiceValidationResult => {
  const slots = payload.regressionBuildSlots;
  
  // Check if slots array is missing or empty
  if (!slots || slots.length === 0) {
    return {
      isValid: false,
      error: 'At least one regression slot is required. Please add regression build slots to proceed.'
    };
  }

  return { isValid: true };
};

/**
 * Validates that PRE_REGRESSION_BUILD workflows exist for all selected platforms
 * when pre-regression builds are enabled in CI/CD mode.
 * 
 * @param verboseConfig - The verbose release config with hydrated workflows
 * @param platformTargets - The platform-target combinations for the release
 * @param hasManualBuildUpload - Whether manual build upload is enabled
 * @returns Validation result
 */
export const validatePreRegressionWorkflows = (
  verboseConfig: VerboseReleaseConfiguration | null,
  platformTargets: Array<{ platform: string }>,
  hasManualBuildUpload: boolean
): ServiceValidationResult => {
  // Only validate in CI/CD mode (not manual upload)
  if (hasManualBuildUpload) {
    return { isValid: true };
  }

  // Only validate if CI config exists
  const hasCiConfig = verboseConfig?.ciConfig !== null && verboseConfig?.ciConfig !== undefined;
  if (!hasCiConfig) {
    return { isValid: true };
  }

  const workflows = verboseConfig.ciConfig?.workflows ?? [];
  
  // Filter to PRE_REGRESSION_BUILD workflows only
  const preRegressionWorkflows = workflows.filter(
    w => w.workflowType === WorkflowType.PRE_REGRESSION_BUILD
  );

  // Get unique platforms from platform targets (normalized to uppercase)
  const uniquePlatforms = [...new Set(
    platformTargets
      .map(pt => normalizePlatform(pt.platform))
      .filter((p): p is string => p !== undefined)
  )];

  // Check if each platform has a PRE_REGRESSION_BUILD workflow
  const missingPlatforms: string[] = [];
  
  for (const platform of uniquePlatforms) {
    const hasWorkflow = preRegressionWorkflows.some(
      w => normalizePlatform(w.platform) === platform
    );
    
    if (!hasWorkflow) {
      missingPlatforms.push(platform);
    }
  }

  const hasMissingPlatforms = missingPlatforms.length > 0;
  if (hasMissingPlatforms) {
    return {
      isValid: false,
      error: `Pre-regression build workflows not configured for platforms: ${missingPlatforms.join(', ')}`
    };
  }

  return { isValid: true };
};

