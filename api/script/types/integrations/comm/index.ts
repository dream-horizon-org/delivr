// Integration types
export type {
  CreateOrUpdateIntegrationDto,
  UpdateIntegrationDataDto,
  CreateOrUpdateIntegrationResult
} from './slack-integration';

// Channel config types
export type {
  CreateChannelConfigDto,
  UpdateStageChannelsDto,
  ValidationError,
  ChannelConfigValidationResult
} from './slack-channel-config';

// Re-export storage types for convenience
export type {
  StageChannelMapping,
  SlackChannel
} from '../../../storage/integrations/comm/slack-types';

