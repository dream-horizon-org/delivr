/**
 * Distribution Constants - Single Source of Truth
 * 
 * All distribution-related enums, types, and arrays are defined here.
 * Import from this file in controllers, services, models, etc.
 */

// ============================================================================
// DISTRIBUTION ENUMS
// ============================================================================

/**
 * Distribution status lifecycle
 * Tracks the progression of a release distribution across platforms
 */
export const DISTRIBUTION_STATUS = {
  PENDING: 'PENDING',
  PARTIALLY_SUBMITTED: 'PARTIALLY_SUBMITTED',
  SUBMITTED: 'SUBMITTED',
  PARTIALLY_RELEASED: 'PARTIALLY_RELEASED',
  RELEASED: 'RELEASED'
} as const;

export const DISTRIBUTION_STATUSES = Object.values(DISTRIBUTION_STATUS);
export type DistributionStatus = typeof DISTRIBUTION_STATUS[keyof typeof DISTRIBUTION_STATUS];

/**
 * Supported platforms for distribution
 */
export const DISTRIBUTION_PLATFORM = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  WEB: 'WEB'
} as const;

export const DISTRIBUTION_PLATFORMS = Object.values(DISTRIBUTION_PLATFORM);
export type DistributionPlatform = typeof DISTRIBUTION_PLATFORM[keyof typeof DISTRIBUTION_PLATFORM];

/**
 * Supported store types for distribution
 */
export const DISTRIBUTION_STORE_TYPE = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
  TESTFLIGHT: 'TESTFLIGHT',
  FIREBASE: 'FIREBASE',
  WEB: 'WEB'
} as const;

export const DISTRIBUTION_STORE_TYPES = Object.values(DISTRIBUTION_STORE_TYPE);
export type DistributionStoreType = typeof DISTRIBUTION_STORE_TYPE[keyof typeof DISTRIBUTION_STORE_TYPE];

// ============================================================================
// ERROR & SUCCESS MESSAGES
// ============================================================================

export const DISTRIBUTION_ERROR_MESSAGES = {
  TENANT_ID_REQUIRED: 'Distribution operation failed: tenantId is required',
  RELEASE_ID_REQUIRED: 'Distribution operation failed: releaseId is required',
  BRANCH_REQUIRED: 'Distribution operation failed: branch is required',
  PLATFORMS_REQUIRED: 'Distribution operation failed: configuredListOfPlatforms is required',
  STORE_TYPES_REQUIRED: 'Distribution operation failed: configuredListOfStoreTypes is required',
  INVALID_PLATFORMS: `Distribution operation failed: platforms must be one of: ${DISTRIBUTION_PLATFORMS.join(', ')}`,
  INVALID_STORE_TYPES: `Distribution operation failed: store types must be one of: ${DISTRIBUTION_STORE_TYPES.join(', ')}`,
  INVALID_STATUS: `Distribution operation failed: status must be one of: ${DISTRIBUTION_STATUSES.join(', ')}`,
  DISTRIBUTION_NOT_FOUND: 'Distribution not found',
  NO_DISTRIBUTIONS_FOR_TENANT: 'No Distribution exists for this tenant',
  CREATE_FAILED: 'Failed to create distribution',
  UPDATE_FAILED: 'Failed to update distribution',
  DELETE_FAILED: 'Failed to delete distribution'
} as const;

export const DISTRIBUTION_SUCCESS_MESSAGES = {
  CREATED: 'Distribution created successfully',
  UPDATED: 'Distribution updated successfully',
  DELETED: 'Distribution deleted successfully',
  STATUS_UPDATED: 'Distribution status updated successfully'
} as const;

