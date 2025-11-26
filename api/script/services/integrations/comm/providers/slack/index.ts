export { SlackProvider } from './slack.provider';

export {
  SLACK_API_BASE_URL,
  SLACK_API_ENDPOINTS,
  SLACK_ERROR_MESSAGES,
  SLACK_CONTENT_TYPES,
  SLACK_LIMITS
} from './slack.constants';

export type {
  SlackConfig,
  SlackUploadUrlResponse,
  SlackCompleteUploadResponse,
  SlackAuthTestResponse,
  SlackConversationsListResponse
} from './slack.interface';

// Utilities (Slack-specific message formatting and file downloads)
export { buildMessage, buildSlackMessage, downloadFileFromUrl } from './slack.utils';
