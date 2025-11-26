/**
 * Communication Integration Constants
 * Scoped constants specific to integration management (credentials, verification)
 */

export const COMM_INTEGRATION_ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid bot token format. Token must start with \'xoxb-\'',
  TOKEN_REQUIRED: 'botToken is required',
  INTEGRATION_NOT_FOUND: 'Communication integration not found',
  CREATE_INTEGRATION_FAILED: 'Failed to create communication integration',
  UPDATE_INTEGRATION_FAILED: 'Failed to update communication integration',
  DELETE_INTEGRATION_FAILED: 'Failed to delete communication integration',
  FETCH_INTEGRATION_FAILED: 'Failed to fetch communication integration',
  FETCH_CHANNELS_FAILED: 'Failed to fetch channels',
  VERIFY_TOKEN_FAILED: 'Failed to verify token',
  FETCH_PROVIDERS_FAILED: 'Failed to fetch communication providers'
} as const;

export const COMM_INTEGRATION_SUCCESS_MESSAGES = {
  INTEGRATION_CREATED: 'Communication integration created successfully',
  INTEGRATION_UPDATED: 'Communication integration updated successfully',
  INTEGRATION_DELETED: 'Communication integration deleted successfully',
  TOKEN_VERIFIED: 'Token verified successfully',
  CHANNELS_FETCHED: 'Channels fetched successfully'
} as const;

export const COMM_INTEGRATION_VALIDATION = {
  TOKEN_PREFIX: 'xoxb-',
  MIN_TOKEN_LENGTH: 20
} as const;

/**
 * Communication Provider Metadata
 * Information about available communication/messaging providers
 */
export const COMM_PROVIDERS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Real-time messaging platform for team collaboration',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Channels', 'Direct Messages', 'File Sharing', 'Threads', 'Webhooks', 'Bot Integration']
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Microsoft\'s unified communication platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Channels', 'Chat', 'Meetings', 'File Sharing', 'Integration with Office 365']
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Voice, video and text communication platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Servers', 'Channels', 'Voice Chat', 'Webhooks', 'Bot Integration']
  }
] as const;

