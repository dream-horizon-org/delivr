/**
 * Google OAuth Token Refresh
 * 
 * Handles automatic refresh of Google ID tokens using refresh tokens
 * Ensures users stay authenticated without manual re-login
 */

import axios from 'axios';
import {
  AUTH_CONFIG,
  AUTH_ERROR_MESSAGES,
  GOOGLE_TOKEN_ENDPOINT
} from './auth.constants';
import type { User } from './auth.interface';

/**
 * Check if token needs to be refreshed
 */
export function needsTokenRefresh(user: User): boolean {
  const tokenExpiresAt = user.user.tokenExpiresAt;
  
  if (tokenExpiresAt === null) {
    return false;
  }
  
  return tokenExpiresAt < Date.now() + AUTH_CONFIG.TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Refresh the Google ID token using refresh token
 * Returns updated user object with new token
 */
export async function refreshGoogleToken(user: User): Promise<User> {
  const refreshToken = user.user.refreshToken;
  
  if (refreshToken === null) {
    throw new Error(AUTH_ERROR_MESSAGES.NO_REFRESH_TOKEN);
  }
  
  console.log('[Token Refresh] Refreshing expired Google token...');
  
  try {
    const response = await axios.post(GOOGLE_TOKEN_ENDPOINT, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    const newIdToken = response.data.id_token;
    const expiresIn = response.data.expires_in || 3600;
    
    // Validate that we received a new token
    if (!newIdToken) {
      throw new Error('Google did not return a new ID token in refresh response');
    }
    
    console.log('[Token Refresh] ✅ Token refreshed successfully');
    
    return {
      ...user,
      user: {
        ...user.user,
        idToken: newIdToken,
        tokenExpiresAt: Date.now() + (expiresIn * 1000)
      }
    };
  } catch (error: any) {
    console.error('[Token Refresh] ❌ Failed to refresh token:', error.response?.data || error.message);
    
    if (error.response?.status === 400 || error.response?.status === 401) {
      throw new Error(AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID);
    }
    
    throw new Error(AUTH_ERROR_MESSAGES.REFRESH_FAILED);
  }
}

/**
 * Ensure user has a fresh token, refreshing if necessary
 */
export async function ensureFreshToken(user: User): Promise<User> {
  if (needsTokenRefresh(user)) {
    return await refreshGoogleToken(user);
  }
  console.log("need refresh token", user)
  return user;
}

