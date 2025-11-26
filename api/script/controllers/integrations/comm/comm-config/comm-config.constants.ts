/**
 * Communication Configuration Constants
 * Scoped constants specific to channel configuration management
 */

export const COMM_CONFIG_ERROR_MESSAGES = {
  CONFIG_NOT_FOUND: 'Channel configuration not found',
  CREATE_CONFIG_FAILED: 'Failed to create channel configuration',
  UPDATE_CONFIG_FAILED: 'Failed to update channel configuration',
  DELETE_CONFIG_FAILED: 'Failed to delete channel configuration',
  FETCH_CONFIG_FAILED: 'Failed to fetch channel configuration',
  INVALID_CHANNEL_DATA: 'Invalid channel data format',
  INTEGRATION_REQUIRED: 'Communication integration is required before creating config'
} as const;

export const COMM_CONFIG_SUCCESS_MESSAGES = {
  CONFIG_CREATED: 'Channel configuration created successfully',
  CONFIG_UPDATED: 'Channel configuration updated successfully',
  CONFIG_DELETED: 'Channel configuration deleted successfully'
} as const;

export const COMM_CONFIG_VALIDATION = {
  MAX_CHANNELS_PER_STAGE: 10,
  MAX_CHANNELS_PER_BUCKET: 10
} as const;

