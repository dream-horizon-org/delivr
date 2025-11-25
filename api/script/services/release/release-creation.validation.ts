/**
 * Release Creation Service Layer Validations
 * 
 * Validates business rules and data integrity before creating releases.
 * These are service-layer validations that go beyond simple request format validation.
 */

import { ReleaseConfigService } from '../release-configs/release-config.service';
import type { CreateReleasePayload } from '~types/release';

/**
 * Validation result interface
 */
export interface ServiceValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that the release config exists, belongs to the tenant, and is active
 */
export const validateReleaseConfig = async (
  payload: CreateReleasePayload,
  releaseConfigService: ReleaseConfigService
): Promise<ServiceValidationResult> => {
  // Skip validation if no releaseConfigId provided (ad-hoc releases)
  if (!payload.releaseConfigId) {
    return { isValid: true };
  }

  // Check if release config exists
  const releaseConfig = await releaseConfigService.getConfigById(payload.releaseConfigId);
  
  if (!releaseConfig) {
    return {
      isValid: false,
      error: `Release config with ID '${payload.releaseConfigId}' not found`
    };
  }

  // Check if release config belongs to the tenant (security check)
  if (releaseConfig.tenantId !== payload.tenantId) {
    return {
      isValid: false,
      error: `Release config '${payload.releaseConfigId}' does not belong to tenant '${payload.tenantId}'`
    };
  }

  // Check if release config is active (business rule check)
  if (!releaseConfig.isActive) {
    return {
      isValid: false,
      error: `Release config '${payload.releaseConfigId}' is not active`
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
 * Master validation function that runs all service-layer validations
 */
export const validateReleaseCreation = async (
  payload: CreateReleasePayload,
  releaseConfigService: ReleaseConfigService,
  releaseRepo: any
): Promise<ServiceValidationResult> => {
  // Run all validations in sequence
  const validations = [
    await validateReleaseConfig(payload, releaseConfigService),
    await validateBaseRelease(payload, releaseRepo)
  ];

  // Return the first validation that fails
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

