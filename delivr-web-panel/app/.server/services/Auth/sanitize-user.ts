/**
 * Sanitize User for Client-Side Exposure
 * 
 * SECURITY: Never expose tokens, refreshToken, or tokenExpiresAt to client
 * These are server-side only and stored in httpOnly cookies
 */

import type { User } from './auth.interface';

/**
 * Remove sensitive authentication data before sending to client
 * NEVER send: idToken, refreshToken, tokenExpiresAt
 * 
 * Note: Returns the same User type structure but with nullified sensitive fields
 */
export function sanitizeUser(user: User): User {
  return {
    authenticated: user.authenticated,
    user: {
      id: user.user.id,
      name: user.user.name,
      email: user.user.email,
      createdAt: user.user.createdAt,
      updatedAt: user.user.updatedAt,
      createdTime: user.user.createdTime,
      idToken: null,          // Nullify for security
      refreshToken: null,     // Nullify for security
      tokenExpiresAt: null,   // Nullify for security
    },
  };
}

