/**
 * Release Config specific error and success messages
 */

import type { PlatformTargetMappingAttributes } from '~models/release';

/**
 * Valid platform values for release configurations
 * Derived from PlatformTargetMappingAttributes.platform type
 */
export const VALID_PLATFORMS: readonly PlatformTargetMappingAttributes['platform'][] = ['IOS', 'ANDROID'] as const;

/**
 * Valid target values for release configurations
 * Derived from PlatformTargetMappingAttributes.target type (WEB not supported yet)
 */
export const VALID_TARGETS: readonly PlatformTargetMappingAttributes['target'][] = ['PLAY_STORE', 'APP_STORE', 'DOTA'] as const;

export const RELEASE_CONFIG_ERROR_MESSAGES = {
  CREATE_CONFIG_FAILED: 'Failed to create release configuration',
  GET_CONFIG_FAILED: 'Failed to get release configuration',
  LIST_CONFIGS_FAILED: 'Failed to list release configurations',
  UPDATE_CONFIG_FAILED: 'Failed to update release configuration',
  DELETE_CONFIG_FAILED: 'Failed to delete release configuration',
  CONFIG_NOT_FOUND: 'Release configuration not found',
  CONFIG_ALREADY_EXISTS: 'Configuration profile already exists',
  NO_INTEGRATIONS: 'At least one integration must be configured',
  INVALID_TENANT_ID: 'Invalid app id',
  INVALID_NAME: 'Invalid configuration name',
  INVALID_RELEASE_TYPE: 'Invalid release type',
  INVALID_TARGETS: 'Invalid targets',
  UNKNOWN_ERROR: 'Unknown release configuration error occurred'
} as const;

export const RELEASE_CONFIG_SUCCESS_MESSAGES = {
  CONFIG_CREATED: 'Release configuration created successfully',
  CONFIG_UPDATED: 'Release configuration updated successfully',
  CONFIG_DELETED: 'Release configuration deleted successfully'
} as const;

