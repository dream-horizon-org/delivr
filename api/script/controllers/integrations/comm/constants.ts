/**
 * Communication Integration Constants
 * Domain-specific constants for communication integrations (Slack, Teams, etc.)
 */

export const COMM_ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid bot token format. Token must start with \'xoxb-\'',
  TOKEN_REQUIRED: 'botToken is required',
  INTEGRATION_NOT_FOUND: 'Slack integration not found',
  CHANNEL_CONFIG_NOT_FOUND: 'Channel configuration not found',
  CREATE_INTEGRATION_FAILED: 'Failed to create Slack integration',
  UPDATE_INTEGRATION_FAILED: 'Failed to update Slack integration',
  DELETE_INTEGRATION_FAILED: 'Failed to delete Slack integration',
  CREATE_CHANNEL_CONFIG_FAILED: 'Failed to create channel configuration',
  UPDATE_CHANNEL_CONFIG_FAILED: 'Failed to update channel configuration',
  DELETE_CHANNEL_CONFIG_FAILED: 'Failed to delete channel configuration',
  FETCH_CHANNELS_FAILED: 'Failed to fetch Slack channels',
  VERIFY_TOKEN_FAILED: 'Failed to verify Slack token',
  SEND_MESSAGE_FAILED: 'Failed to send Slack message'
} as const;

export const COMM_SUCCESS_MESSAGES = {
  INTEGRATION_CREATED: 'Slack integration created successfully',
  INTEGRATION_UPDATED: 'Slack integration updated successfully',
  INTEGRATION_DELETED: 'Slack integration deleted successfully',
  CHANNEL_CONFIG_CREATED: 'Channel configuration created successfully',
  CHANNEL_CONFIG_UPDATED: 'Channel configuration updated successfully',
  CHANNEL_CONFIG_DELETED: 'Channel configuration deleted successfully',
  TOKEN_VERIFIED: 'Slack token verified successfully',
  CHANNELS_FETCHED: 'Slack channels fetched successfully',
  MESSAGE_SENT: 'Message sent successfully'
} as const;

export const COMM_VALIDATION = {
  TOKEN_PREFIX: 'xoxb-',
  MAX_CHANNELS_PER_STAGE: 10,
  MIN_TOKEN_LENGTH: 20
} as const;

