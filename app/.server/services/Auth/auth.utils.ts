/**
 * Authentication Utility Functions
 * Pure functions for auth-related operations
 */

import { AUTH_CONFIG } from './auth.constants';
import type { User } from './auth.interface';
import { AuthenticatorService } from './auth.service';

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
 * @param error - The error object
 * @param includeBackendUrl - If true, includes backend URL in connection error messages
 */
export function getAuthErrorMessage(error: any, includeBackendUrl: boolean = false): string {
  const backendUrl = includeBackendUrl ? ` on ${getBackendURL()}` : '';
  
  if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
    return `Cannot connect to backend server. Please ensure the server is running${backendUrl}`;
  }
  
  if (error?.code === 'ENOTFOUND' || error?.message?.includes('ENOTFOUND')) {
    return `Backend server not found. Please check your configuration${backendUrl}`;
  }
  
  if (error?.response?.status === 401) {
    return 'Authentication failed. Please try again.';
  }
  
  if (error?.response?.status === 404) {
    return 'User not found';
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

// ============================================================================
// Legacy Helper Functions
// ============================================================================

/**
 * Require authenticated user ID from request
 * Throws if user is not authenticated
 * 
 * @deprecated Use authenticateActionRequest or authenticateLoaderRequest instead
 * @param request - The incoming request
 * @returns User ID string
 * @throws Response - Redirect or 401 Unauthorized
 */
export async function requireUserId(request: Request): Promise<string> {
  try {
    const authResult = await AuthenticatorService.isAuthenticated(request);
    
    // Check if it's a redirect response
    if (authResult instanceof Response) {
      throw authResult;
    }
    
    const user = authResult as User;
    
    if (!user || !user.user || !user.user.id) {
      throw new Response('Unauthorized', { status: 401 });
    }
    
    return user.user.id;
  } catch (error) {
    // If it's already a Response (redirect), re-throw it
    if (error instanceof Response) {
      throw error;
    }
    
    // For any other error (e.g., invalid API key), return 401
    console.error('[requireUserId] Authentication error:', error);
    throw new Response('Unauthorized', { status: 401 });
  }
}
