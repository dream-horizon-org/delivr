/**
 * Slack Integration Validation
 * Input validation for integration endpoints
 */

/**
 * Validate bot token format
 */
export const validateBotToken = (botToken: unknown): string | null => {
  if (!botToken) {
    return 'Bot token is required';
  }

  if (typeof botToken !== 'string') {
    return 'Bot token must be a string';
  }

  if (!botToken.startsWith('xoxb-')) {
    return 'Invalid Slack bot token format. Must start with "xoxb-"';
  }

  return null;
};

/**
 * Validate workspace ID
 */
export const validateWorkspaceId = (workspaceId: unknown): string | null => {
  if (!workspaceId) {
    return null; // Optional field
  }

  if (typeof workspaceId !== 'string') {
    return 'Workspace ID must be a string';
  }

  return null;
};

/**
 * Validate workspace name
 */
export const validateWorkspaceName = (workspaceName: unknown): string | null => {
  if (!workspaceName) {
    return null; // Optional field
  }

  if (typeof workspaceName !== 'string') {
    return 'Workspace name must be a string';
  }

  return null;
};

/**
 * Validate bot user ID
 */
export const validateBotUserId = (botUserId: unknown): string | null => {
  if (!botUserId) {
    return null; // Optional field
  }

  if (typeof botUserId !== 'string') {
    return 'Bot user ID must be a string';
  }

  return null;
};

