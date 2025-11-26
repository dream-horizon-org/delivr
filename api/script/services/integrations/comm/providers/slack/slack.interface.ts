/**
 * Slack Provider Type Definitions
 * All Slack-specific types and interfaces
 */

import type { CommConfig } from '../../comm-types';

/**
 * Slack-specific configuration
 * Extends base CommConfig with Slack-specific fields
 */
export type SlackConfig = CommConfig & {
  botToken: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
};

/**
 * Slack API Response Types
 */

// File Upload Flow Types
export type SlackUploadUrlResponse = {
  ok: boolean;
  upload_url?: string;
  file_id?: string;
  error?: string;
};

export type SlackFileUploadResponse = {
  ok: boolean;
  status?: number;
  statusText?: string;
};

export type SlackCompleteUploadPayload = {
  files: Array<{
    id: string;
    title: string;
  }>;
  channel_id: string;
  initial_comment?: string;
  thread_ts?: string;
};

export type SlackCompleteUploadResponse = {
  ok: boolean;
  files?: Array<{
    id: string;
    name?: string;
    permalink?: string;
    url_private?: string;
  }>;
  error?: string;
};

export type SlackUploadedFile = {
  id: string;
  name: string;
  url?: string;
};

// Auth & Verification Types
export type SlackAuthTestResponse = {
  ok: boolean;
  team_id?: string;
  team?: string;
  user_id?: string;
  error?: string;
};

export type SlackApiTestResponse = {
  ok: boolean;
  error?: string;
};

// Channel Types
export type SlackConversation = {
  id: string;
  name: string;
  is_private?: boolean;
  num_members?: number;
};

export type SlackConversationsListResponse = {
  ok: boolean;
  channels?: SlackConversation[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
};

// Message Types
export type SlackPostMessageResponse = {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: unknown;
  error?: string;
};

/**
 * Internal Types
 */
export type ContentTypeMapping = {
  [key: string]: string;
};

