// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Comm Service Types
 * Type definitions for Communication/Messaging operations
 */

export enum CommType {
  SLACK = 'SLACK'
  // TEAMS = 'TEAMS',  // Future
  // EMAIL = 'EMAIL'   // Future
}

/**
 * File attachment for messages
 */
export interface MessageFile {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  title?: string;
  initialComment?: string;
}

/**
 * Message Operations
 */
export interface SendMessageArgs {
  channelId: string | string[]; // Single channel or array of channels
  text: string;
  files?: MessageFile[]; // Files to upload with message
  threadTs?: string; // For threaded messages
}

export interface MessageResponse {
  ok: boolean;
  channel: string;
  ts: string; // Message timestamp (unique ID)
  message?: any;
  error?: string;
  file?: {
    id: string;
    name: string;
    url?: string;
  };
}

/**
 * Channel Operations
 */
export interface Channel {
  id: string;
  name: string;
  isPrivate?: boolean;
  memberCount?: number;
}

export interface ListChannelsResponse {
  channels: Channel[];
  total: number;
}

/**
 * Comm Configuration
 * Note: Channels will be managed separately via slack_configuration table
 */
export interface CommConfig {
  commType: CommType;
  botToken?: string; // For Slack
  workspaceId?: string;
  webhookUrl?: string; // For Teams/Discord
}

/**
 * Verification & Health Check
 */
export interface VerificationResult {
  success: boolean;
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  error?: string;
  details?: any;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number; // in ms
  error?: string;
}
