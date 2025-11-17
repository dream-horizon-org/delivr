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

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationType {
  RELEASE_CREATED = 'release_created',
  RELEASE_DEPLOYED = 'release_deployed',
  BUILD_STARTED = 'build_started',
  BUILD_SUCCESS = 'build_success',
  BUILD_FAILED = 'build_failed',
  DEPLOYMENT_STARTED = 'deployment_started',
  DEPLOYMENT_SUCCESS = 'deployment_success',
  DEPLOYMENT_FAILED = 'deployment_failed',
  ROLLBACK_INITIATED = 'rollback_initiated',
  ROLLBACK_COMPLETED = 'rollback_completed'
}

/**
 * Message Operations
 */
export interface SendMessageArgs {
  channelId: string;
  text: string;
  blocks?: any[]; // Slack Block Kit or equivalent
  attachments?: MessageAttachment[];
  threadTs?: string; // For threaded messages
  priority?: MessagePriority;
}

export interface MessageAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: AttachmentField[];
  footer?: string;
  timestamp?: number;
}

export interface AttachmentField {
  title: string;
  value: string;
  short?: boolean;
}

export interface MessageResponse {
  ok: boolean;
  channel: string;
  ts: string; // Message timestamp (unique ID)
  message?: any;
  error?: string;
}

/**
 * Release Notification Operations
 */
export interface ReleaseNotificationArgs {
  releaseName: string;
  version: string;
  environment?: string;
  changes?: string[];
  url?: string;
  author?: string;
  status?: 'created' | 'deployed' | 'failed';
  channels: string[]; // Multiple channels
}

export interface BuildNotificationArgs {
  buildId: string;
  status: 'started' | 'success' | 'failed';
  branch?: string;
  commit?: string;
  duration?: number; // in seconds
  url?: string;
  error?: string;
  channels: string[];
}

export interface DeploymentNotificationArgs {
  deploymentId: string;
  environment: string;
  status: 'started' | 'success' | 'failed' | 'rollback';
  version?: string;
  url?: string;
  error?: string;
  channels: string[];
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
 * User/Member Operations
 */
export interface User {
  id: string;
  name: string;
  realName?: string;
  email?: string;
}

export interface MentionUser {
  userId: string;
  text?: string;
}

/**
 * Comm Configuration
 */
export interface CommConfig {
  commType: CommType;
  botToken?: string; // For Slack
  workspaceId?: string;
  webhookUrl?: string; // For Teams/Discord
  channels?: Channel[];
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
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number; // in ms
  error?: string;
}

/**
 * Formatted Message Templates
 */
export interface ReleaseMessageTemplate {
  type: NotificationType;
  title: string;
  description: string;
  color: string;
  fields: AttachmentField[];
  footer?: string;
}


