// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Communication Service Interface
 * Defines contract for communication platform implementations
 * Currently implemented by SlackService
 */

import type {
  MessageResponse,
  SendMessageArgs,
  ReleaseNotificationArgs,
  BuildNotificationArgs,
  DeploymentNotificationArgs,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from './comm-types';
import { MessageTemplate } from './templates';

/**
 * ICommService - Interface for communication services
 * 
 * Current implementation: SlackService
 */
export interface ICommService {
  // ============================================================================
  // CORE MESSAGING
  // ============================================================================

  /**
   * Send message using predefined template
   * This is the main method for template-based messaging
   * 
   * @param tenantId - Tenant ID (for context/logging)
   * @param templateEnum - Template type from MessageTemplate enum
   * @param templateParameters - Array of parameters to fill template
   * @param sendOnThread - Whether to send as thread
   * @returns Map of channel IDs to message responses
   */
  sendTemplateMessage(
    tenantId: string,
    templateEnum: MessageTemplate,
    templateParameters: string[],
    sendOnThread?: boolean
  ): Promise<Map<string, MessageResponse>>;

  /**
   * Send a basic text message to a channel
   * 
   * @param args - Message arguments
   * @returns Message response
   */
  sendBasicMessage(args: SendMessageArgs): Promise<MessageResponse>;


  // ============================================================================
  // RELEASE NOTIFICATIONS
  // ============================================================================

  /**
   * Send release notification to multiple channels
   * 
   * @param args - Release notification arguments
   * @returns Map of channel IDs to message responses
   */
  sendReleaseNotification(
    args: ReleaseNotificationArgs
  ): Promise<Map<string, MessageResponse>>;

  /**
   * Send build status notification
   * 
   * @param args - Build notification arguments
   * @returns Map of channel IDs to message responses
   */
  sendBuildNotification(
    args: BuildNotificationArgs
  ): Promise<Map<string, MessageResponse>>;

  /**
   * Send deployment status notification
   * 
   * @param args - Deployment notification arguments
   * @returns Map of channel IDs to message responses
   */
  sendDeploymentNotification(
    args: DeploymentNotificationArgs
  ): Promise<Map<string, MessageResponse>>;

  // ============================================================================
  // CHANNEL OPERATIONS
  // ============================================================================

  /**
   * List all channels the bot/service has access to
   * 
   * @returns List of channels with metadata
   */
  listChannels(): Promise<ListChannelsResponse>;

  /**
   * Get specific channel details
   * 
   * @param channelId - Channel ID
   * @returns Channel details or null if not found
   */
  getChannel(channelId: string): Promise<Channel | null>;

  // ============================================================================
  // VERIFICATION & HEALTH
  // ============================================================================

  /**
   * Verify connection and credentials
   * 
   * @returns Verification result with workspace/service details
   */
  verify(): Promise<VerificationResult>;

  /**
   * Health check - test if service API is responsive
   * 
   * @returns Health status with latency
   */
  healthCheck(): Promise<HealthCheckResult>;

  // ============================================================================
  // FORMATTING HELPERS (Optional - platform specific)
  // ============================================================================

  /**
   * Format mention for user (optional)
   * 
   * @param userId - User ID
   * @returns Formatted mention string
   */
  formatMention?(userId: string): string;

  /**
   * Format channel mention (optional)
   * 
   * @param channelId - Channel ID
   * @returns Formatted channel mention string
   */
  formatChannelMention?(channelId: string): string;

  /**
   * Format link (optional)
   * 
   * @param url - URL to format
   * @param text - Optional link text
   * @returns Formatted link string
   */
  formatLink?(url: string, text?: string): string;
}


