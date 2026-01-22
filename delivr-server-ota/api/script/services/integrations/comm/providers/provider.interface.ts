// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Communication Service Interface
 * Defines contract for communication platform implementations
 * Currently implemented by SlackService
 */

import type {
  CommType,
  MessageResponse,
  MessageFile,
  SendMessageArgs,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from '../comm-types';
import type { Task, Platform } from '../messaging/messaging.interface';

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
   * Send a templated message to appropriate channels based on task
   * Automatically maps task to buckets and sends to configured channels
   * 
   * @param configId - Channel configuration ID (from respective integration table)
   * @param task - Message template task type (e.g., Task.REGRESSION_BUILDS)
   * @param parameters - Array of values to replace placeholders {0}, {1}, {2}...
   * @param fileUrl - Optional: URL of file to download and attach to the message
   * @param platform - Optional: platform for platform-specific templates (e.g., Platform.IOS)
   * @returns Map of channel IDs to message responses
   */
  sendMessage(
    configId: string,
    task: Task,
    parameters: string[],
    fileUrl?: string,
    platform?: Platform
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
