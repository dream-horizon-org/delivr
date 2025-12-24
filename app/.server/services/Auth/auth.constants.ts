/**
 * Authentication Constants
 * All authentication-related constants
 */

export const AUTH_CONFIG = {
  // Backend URLs
  DEFAULT_BACKEND_URL: 'http://localhost:3010',
  
  // Token expiration
  TOKEN_EXPIRY_MS: 3600 * 1000, // 1 hour
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000, // 5 minutes before expiry
  
  // OAuth settings
  OAUTH_ACCESS_TYPE: 'offline' as const,
  OAUTH_PROMPT: 'consent' as const,
} as const;

export const AUTH_ERROR_MESSAGES = {
  BACKEND_UNREACHABLE: 'Cannot connect to backend server. Please ensure the server is running',
  INVALID_TOKEN: 'Invalid authentication token',
  USER_NOT_FOUND: 'User not found',
  AUTHENTICATION_FAILED: 'Failed to authenticate with backend server',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  NO_REFRESH_TOKEN: 'No refresh token available. User must re-authenticate.',
  REFRESH_FAILED: 'Failed to refresh token',
} as const;

export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

