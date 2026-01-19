// Core integration types (from comm-integration.interface.ts)
export * from './comm-integration';

// Integration types (controller DTOs)
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

