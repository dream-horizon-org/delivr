/**
 * Authentication Module - Public Exports
 * 
 * Centralized exports for authentication-related functionality
 */

// ============================================================================
// Main Auth Service & Enums
// ============================================================================
export {
  Auth, // Auth class
  AuthenticatorService, // Auth instance (singleton)
  SocialsProvider // OAuth provider enum
} from './auth.service';

// ============================================================================
// Types & Interfaces
// ============================================================================
export type {
  AuthenticatorRoutes, // Route constants
  User, // User type
  UserReturnType // Return type for auth functions
} from './auth.interface';

// ============================================================================
// Token Management
// ============================================================================
export {
  ensureFreshToken, // Ensure token is fresh (refresh if needed)
  needsTokenRefresh, // Check if token needs refresh
  refreshGoogleToken // Refresh Google OAuth token
} from './token-refresh';

// ============================================================================
// Security & Sanitization
// ============================================================================
export {
  sanitizeUser // Strip sensitive data before sending to client
} from './sanitize-user';

// ============================================================================
// Constants
// ============================================================================
export {
  AUTH_CONFIG, // Auth configuration (URLs, timeouts, etc.)
  AUTH_ERROR_MESSAGES, // Error message constants
  GOOGLE_TOKEN_ENDPOINT // Google OAuth token endpoint
} from './auth.constants';

// ============================================================================
// Utility Functions
// ============================================================================
export {
  getAuthenticatorCallbackUrl, // Get OAuth callback URL
  getAuthErrorMessage, // Get user-friendly error message
  getBackendURL, // Get backend URL with fallback
  isBackendConnectionError // Check if error is connection-related
} from './auth.utils';

