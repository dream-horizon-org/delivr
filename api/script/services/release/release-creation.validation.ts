/**
 * Release Creation Service Layer Validations
 * 
 * Validates business rules and data integrity before creating releases.
 * These are service-layer validations that go beyond simple request format validation.
 */

import { ReleaseConfigService } from '../release-configs/release-config.service';
import { ReleaseVersionService } from './release-version.service';
import type { CreateReleasePayload, Platform, Target } from '~types/release';
import type { ReleaseConfiguration } from '~types/release-configs';

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
 * @param payload - The create release payload containing tenantId and releaseConfigId
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
  const belongsToTenant = config.tenantId === payload.tenantId;
  if (!belongsToTenant) {
    return {
      isValid: false,
      error: `Release config '${payload.releaseConfigId}' does not belong to tenant '${payload.tenantId}'`
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

  const baseRelease = await releaseRepo.findByBaseReleaseId(payload.baseReleaseId, payload.tenantId);
  
  if (!baseRelease) {
    return {
      isValid: false,
      error: `Base release with ID '${payload.baseReleaseId}' not found for tenant '${payload.tenantId}'`
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
      payload.tenantId,
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
 * Fetches the release config once and reuses it for all config-related validations.
 */
export const validateReleaseCreation = async (
  payload: CreateReleasePayload,
  releaseConfigService: ReleaseConfigService,
  releaseRepo: any,
  releaseVersionService: ReleaseVersionService
): Promise<ServiceValidationResult> => {
  // === Config-based validations (only if releaseConfigId is provided) ===
  const hasReleaseConfig = Boolean(payload.releaseConfigId);
  
  if (hasReleaseConfig) {
    // Fetch config once for all config-related validations
    const releaseConfig = await releaseConfigService.getConfigById(payload.releaseConfigId!);
    
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

