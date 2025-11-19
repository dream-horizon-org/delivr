/**
 * Auth Service Exports
 */

import { AuthenticatorService } from './Auth';
import type { User } from './Auth.interface';

/**
 * Require authenticated user ID from request
 * Throws if user is not authenticated
 */
export async function requireUserId(request: Request): Promise<string> {
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
}

export { AuthenticatorService };
export type { User };

