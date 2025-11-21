// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Communication Service Interface
 * Defines contract for communication platform implementations
 * Currently implemented by SlackService
 */

import type {
  MessageResponse,
  MessageFile,
  SendMessageArgs,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from './comm-types';

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
   * Send a plain text message to channels configured for a specific stage
   * Fetches channels based on configId and stageEnum, then sends the message
   * 
   * @param configId - Slack configuration ID (from slack_configuration table)
   * @param stageEnum - Stage name (e.g., "development", "production")
   * @param message - Plain text message to send
   * @param files - Optional: files to attach to the message
   * @returns Map of channel IDs to message responses
   */
  sendSlackMessage(
    configId: string,
    stageEnum: string,
    message: string,
    files?: MessageFile[]
  ): Promise<Map<string, MessageResponse>>;

  /**
   * Send a basic text message to one or more channels
   * Internal method - use sendSlackMessage for standard messaging
   * 
   * @param args - Message arguments (channelId can be string or string[])
   * @returns Map of channel IDs to message responses
   */
  sendBasicMessage(args: SendMessageArgs): Promise<Map<string, MessageResponse>>;

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

  /**
   * Get the timestamp of the last message in a channel
   * Used for auto-threading to the most recent message
   * 
   * @param channelId - Channel ID
   * @returns Message timestamp or undefined if channel has no messages
   */
  getLastMessageTs(channelId: string): Promise<string | undefined>;

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
}
