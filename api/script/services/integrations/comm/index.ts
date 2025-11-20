/**
 * Slack Integration Service Module
 * 
 * Provides Slack messaging capabilities for release notifications
 * 
 * Usage:
 * ```typescript
 * import { SlackService, SlackServiceFactory } from '~/services/integrations/slack';
 * 
 * // Create Slack service for tenant
 * const slackService = await SlackServiceFactory.createForTenant(tenantId);
 * 
 * // Send message to channels configured for a stage
 * await slackService.sendSlackMessage(configId, 'production', 'Release deployed!');
 * ```
 */

export { SlackService } from './slack-service';
export type { ICommService } from './comm-service.interface';
export {
  CommType
} from './comm-types';
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
