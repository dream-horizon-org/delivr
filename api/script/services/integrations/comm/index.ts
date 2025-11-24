/**
 * Communication Services Module
 * Provides communication/messaging capabilities for release notifications
 */

// Services
export { SlackIntegrationService } from './slack-integration';
export { SlackChannelConfigService } from './slack-channel-config';
export { MessagingService } from './messaging';

// Providers
export { SlackService } from './providers/slack';
export type { ICommService } from './providers/provider.interface';
export { ProviderFactory } from './providers/provider.factory';

// Messaging Types & Enums
export {
  Task,
  Platform,
  ChannelBucket,
  BUCKET_TASK_MAPPING
} from './messaging';

// Communication Types
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
