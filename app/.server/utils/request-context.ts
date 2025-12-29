/**
 * Request Context Storage
 * 
 * Provides request-scoped storage for user authentication data
 * Uses AsyncLocalStorage to maintain context across async operations
 * without explicitly passing user through every function call.
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { User } from '~/.server/services/Auth/auth.interface';

interface RequestContext {
  user: User | null;
}

// Create async local storage for request context
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current user from request context
 * Returns null if no user is set in context
 */
export function getCurrentUser(): User | null {
  const store = requestContext.getStore();
  return store?.user ?? null;
}

/**
 * Set user in request context
 * Should be called at the start of each authenticated request
 */
export function setCurrentUser(user: User | null): void {
  const store = requestContext.getStore();
  if (store) {
    store.user = user;
  }
}

/**
 * Run a function with user context
 * Wraps the function execution in a context that has the user available
 */
export function runWithUser<T>(user: User, fn: () => T): T {
  return requestContext.run({ user }, fn);
}

