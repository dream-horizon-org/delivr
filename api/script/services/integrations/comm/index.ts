/**
 * Communication Services Module
 * Provides communication/messaging capabilities for release notifications
 */

// Services
export { SlackIntegrationService } from './slack-integration';
export { SlackChannelConfigService } from './slack-channel-config';
export { SlackService } from './messaging';

// Providers
export { SlackApiService } from './providers/slack';
export type { ICommService } from './providers/provider.interface';
export {
  getSlackIntegrationService,
  getSlackChannelConfigService
} from './providers/provider.factory';

// Types
export { CommType } from './comm-types';
export type {
  CommConfig,
  SendMessageArgs,
  MessageResponse,
  MessageFile,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from './comm-types';
