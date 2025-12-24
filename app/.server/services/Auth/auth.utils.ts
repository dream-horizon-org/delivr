/**
 * Authentication Utility Functions
 * Pure functions for auth-related operations
 */

import { AUTH_CONFIG } from './auth.constants';

/**
 * Get authenticator callback URL for OAuth providers
 * Returns a relative path that resolves to the current domain (frontend)
 * @param provider - The OAuth provider name (e.g., 'google')
 */
export function getAuthenticatorCallbackUrl(provider: string): string {
  return `/auth/${provider}/callback`;
}

/**
 * Get detailed error message from authentication error
 */
export function getAuthErrorMessage(error: any): string {
  if (error?.code === 'ECONNREFUSED') {
    return 'Cannot connect to backend server. Please ensure the server is running.';
  }
  
  if (error?.code === 'ENOTFOUND') {
    return 'Backend server not found. Please check your configuration.';
  }
  
  if (error?.response?.status === 401) {
    return 'Authentication failed. Please try again.';
  }
  
  if (error?.response?.status === 500) {
    return 'Server error occurred. Please try again later.';
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.cause?.message) {
    return error.cause.message;
  }
  
  return 'Authentication failed';
}

/**
 * Check if error is a backend connection error
 */
export function isBackendConnectionError(error: any): boolean {
  return error?.code === 'ECONNREFUSED' || 
         error?.code === 'ENOTFOUND' ||
         error?.message?.includes('ECONNREFUSED') ||
         error?.message?.includes('ENOTFOUND');
}

/**
 * Get backend URL with fallback
 */
export function getBackendURL(): string {
  return process.env.DELIVR_BACKEND_URL || 
         process.env.BACKEND_API_URL || 
         AUTH_CONFIG.DEFAULT_BACKEND_URL;
}
