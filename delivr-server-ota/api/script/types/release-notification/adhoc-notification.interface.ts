/**
 * Ad-Hoc Notification Request/Response Types
 * Based on frontend API contract
 */

/**
 * Slack channel object with ID and name
 */
export type SlackChannelRef = {
  id: string;
  name: string;
};

/**
 * Request body for ad-hoc notification endpoint
 */
export type AdHocNotificationRequest = {
  type: 'custom' | 'template';
  
  // Required when type='template' (for future implementation)
  messageType?: string;
  
  // Required when type='custom'
  customMessage?: string;
  
  // Required - Array of Slack channel objects (id + name)
  channels: SlackChannelRef[];
};

/**
 * Validation result for channel IDs
 */
export type ChannelValidationResult = {
  valid: boolean;
  validChannels: Array<{ id: string; name: string }>;
  invalidChannelIds: string[];
};

/**
 * Response for ad-hoc notification
 */
export type AdHocNotificationResponse = {
  success: true;
  message: string;
  notification: {
    id: number;
    sentTo: string[];  // Channel names with # prefix
    sentAt: string;    // ISO 8601
  };
};

/**
 * Error response structure
 */
export type AdHocNotificationErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
