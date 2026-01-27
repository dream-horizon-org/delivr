/**
 * Slack Channel Configuration Types
 * DTOs and interfaces for channel configuration operations
 */

import type { StageChannelMapping, SlackChannel } from '../comm-integration';

/**
 * DTO for creating channel configuration
 */
export type CreateChannelConfigDto = {
  appId: string;
  channelData: StageChannelMapping;
};

/**
 * DTO for updating stage channels (add/remove)
 */
export type UpdateStageChannelsDto = {
  id: string;
  stage: string;
  action: 'add' | 'remove';
  channels: SlackChannel[];
};

/**
 * Validation error detail
 */
export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validation result for channel configuration
 */
export type ChannelConfigValidationResult = {
  integration: 'communication';
  isValid: boolean;
  errors: ValidationError[];
};

