/**
 * Slack Provider Constants
 * Provider-specific configuration values and constants
 */

export const SLACK_API_BASE_URL = 'https://slack.com/api' as const;

export const SLACK_API_ENDPOINTS = {
  AUTH_TEST: '/auth.test',
  API_TEST: '/api.test',
  CHAT_POST_MESSAGE: '/chat.postMessage',
  CONVERSATIONS_LIST: '/conversations.list',
  FILES_GET_UPLOAD_URL_EXTERNAL: '/files.getUploadURLExternal',
  FILES_COMPLETE_UPLOAD_EXTERNAL: '/files.completeUploadExternal'
} as const;

export const SLACK_ERROR_MESSAGES = {
  TOKEN_REQUIRED: 'Slack bot token is required',
  VERIFICATION_FAILED: 'Slack verification failed',
  CONNECTION_FAILED: 'Slack connection failed',
  CHANNEL_CONFIG_NOT_FOUND: 'Channel configuration not found',
  INTEGRATION_NOT_FOUND: 'Communication integration not found',
  BUILD_MESSAGE_FAILED: 'Failed to build message for task',
  UPLOAD_URL_FAILED: 'Failed to get upload URL',
  FILE_UPLOAD_FAILED: 'Failed to upload file to presigned URL',
  COMPLETE_UPLOAD_FAILED: 'Failed to complete upload',
  SEND_MESSAGE_FAILED: 'Failed to send message to channel',
  LIST_CHANNELS_FAILED: 'Failed to list channels',
  UNKNOWN_ERROR: 'Unknown error',
  UNABLE_TO_READ_ERROR: 'Unable to read error response',
  UNSUPPORTED_COMM_TYPE: 'Unsupported communication type'
} as const;

export const SLACK_CONTENT_TYPES = {
  TEXT: 'text/plain',
  JSON: 'application/json',
  PDF: 'application/pdf',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  JSON_UTF8: 'application/json; charset=utf-8',
  OCTET_STREAM: 'application/octet-stream'
} as const;

export const SLACK_FILE_EXTENSIONS = {
  TXT: '.txt',
  JSON: '.json',
  PDF: '.pdf'
} as const;

export const SLACK_HTTP_STATUS = {
  OK: 200,
  REDIRECT: 302
} as const;

export const SLACK_LIMITS = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
  CONVERSATIONS_LIST_LIMIT: 200
} as const;

export const SLACK_CONVERSATION_TYPES = {
  PUBLIC_CHANNEL: 'public_channel',
  PRIVATE_CHANNEL: 'private_channel'
} as const;

export const SLACK_HTTP_HEADERS = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  CONTENT_LENGTH: 'Content-Length'
} as const;

export const SLACK_AUTH_SCHEMES = {
  BEARER: 'Bearer'
} as const;

export const SLACK_FORM_FIELDS = {
  FILENAME: 'filename',
  LENGTH: 'length'
} as const;

export const SLACK_RESPONSE_FIELDS = {
  OK: 'ok',
  UPLOAD_URL: 'upload_url',
  FILE_ID: 'file_id',
  ERROR: 'error',
  FILES: 'files',
  TEAM_ID: 'team_id',
  TEAM: 'team',
  USER_ID: 'user_id',
  CHANNELS: 'channels',
  RESPONSE_METADATA: 'response_metadata',
  NEXT_CURSOR: 'next_cursor'
} as const;

export const SLACK_MESSAGE_OPTIONS = {
  UNFURL_LINKS: false,
  UNFURL_MEDIA: false
} as const;

