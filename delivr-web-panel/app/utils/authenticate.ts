import {
  ActionFunction,
  ActionFunctionArgs,
  json,
  LoaderFunction,
  LoaderFunctionArgs
} from "@remix-run/node";
import { AxiosError } from "axios";
import { AuthenticatorService } from "~/.server/services/Auth";
import { AUTH_ERROR_MESSAGES } from "~/.server/services/Auth/auth.constants";
import { User } from '~/.server/services/Auth/auth.interface';
import { sanitizeUser } from "~/.server/services/Auth/sanitize-user";
import { ensureFreshToken } from "~/.server/services/Auth/token-refresh";
import { SessionStorageService } from "~/.server/services/SessionStorage";
import { runWithUser } from "~/.server/utils/request-context";

export enum ActionMethods {
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

type AuthenticatedRequestArgs<T> = T & { user: User };

/**
 * Detects if the request is an API request (expects JSON response)
 * by checking Accept and Content-Type headers
 */
function isApiRequest(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  const contentType = request.headers.get('Content-Type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

/**
 * Handles authentication failures by returning appropriate response:
 * - JSON error for API requests
 * - HTML redirect for browser requests with query parameter
 */
async function handleAuthFailure(request: Request): Promise<Response> {
  if (isApiRequest(request)) {
    return json(
      { 
        success: false, 
        error: 'Authentication required. Please refresh the page to log in again.',
        isAuthError: true 
      },
      { status: 401 }
    );
  }
  // Browser request - use logout which properly clears session, with query parameter
  return await AuthenticatorService.logout(request, '/login?sessionExpired=true');
}

export type AuthenticatedLoaderFunction = (
  args: AuthenticatedRequestArgs<LoaderFunctionArgs>
) => ReturnType<LoaderFunction>;

export const authenticateLoaderRequest = (cb?: AuthenticatedLoaderFunction) => {
  return async (args: LoaderFunctionArgs) => {
    const authResult = await AuthenticatorService.isAuthenticated(args.request);
    
    // If not authenticated, isAuthenticated returns a redirect Response
    // For API requests, return JSON error instead of HTML redirect
    if (authResult instanceof Response) {
      if (isApiRequest(args.request)) {
        return json(
          { 
            success: false, 
            error: 'Authentication required. Please refresh the page to log in again.',
            isAuthError: true 
          },
          { status: 401 }
        );
      }
      return authResult;
    }
    
    let user = authResult as User;
    
    try {
      // Ensure token is fresh before making any API calls
      // This will refresh the token if it's expired or about to expire
      user = await ensureFreshToken(user);
      
      // If token was refreshed, commit the session immediately with Set-Cookie header
      if (user.user.idToken !== (authResult as User).user.idToken) {
        const session = await SessionStorageService.sessionStorage.getSession(
          args.request.headers.get("Cookie")
        );
        session.set("_session", user);
        
        // CRITICAL: Commit session and attach Set-Cookie header to response
        const cookieHeader = await SessionStorageService.sessionStorage.commitSession(session);
        
        // Run the loader within user context
        const loaderResponse = await runWithUser(user, async () => {
          const result = await cb?.({ ...args, user });
          return result ?? json(sanitizeUser(user));
        });
        
        // Ensure response is a Response object before setting headers
        if (loaderResponse instanceof Response) {
          loaderResponse.headers.set("Set-Cookie", cookieHeader);
        }
        return loaderResponse;
      }
      
      // No token refresh needed, proceed normally
      return await runWithUser(user, async () => {
        return (await cb?.({ ...args, user })) ?? json(sanitizeUser(user));
      });
    } catch (e) {
      // Log error details for debugging
      console.error('[authenticateLoaderRequest] Error caught:', JSON.stringify({
        errorType: e?.constructor?.name,
        message: e instanceof Error ? e.message : String(e),
        response: e instanceof AxiosError ? {
          status: e.response?.status,
          data: e.response?.data,
          headers: e.response?.headers
        } : undefined,
        stack: e instanceof Error ? e.stack : undefined
      }, null, 2));

      // If token refresh fails (no refresh token or invalid refresh token), handle auth failure
      if (e instanceof Error && (
        e.message === AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID ||
        e.message === AUTH_ERROR_MESSAGES.NO_REFRESH_TOKEN
      )) {
        return await handleAuthFailure(args.request);
      }
      
      // If backend returns 401 (user doesn't exist, session invalid, etc.)
      // Handle auth failure appropriately for API vs browser requests
      if (e instanceof Response && e.status === 401) {
        return await handleAuthFailure(args.request);
      }

      // Rethrow any other Response (e.g. 302 redirects from loader) so Remix can perform redirect
      if (e instanceof Response) {
        throw e;
      }
      
      // If API call returns 401 via AxiosError
      if (e instanceof AxiosError && e.response?.status === 401) {
        return await handleAuthFailure(args.request);
      }
      
      return json(
        {
          message: (e as AxiosError)?.response?.data ?? "Something Went Wrong",
        },
        { status: (e as AxiosError)?.response?.status ?? 500 }
      );
    }
  };
};

export type AuthenticatedActionFunction = (
  args: AuthenticatedRequestArgs<ActionFunctionArgs>
) => ReturnType<ActionFunction>;

type AuthenticatedActionFunctionArgs = Partial<
  Record<ActionMethods, AuthenticatedActionFunction>
>;

export const authenticateActionRequest = (
  cb: AuthenticatedActionFunctionArgs
) => {
  return async (args: ActionFunctionArgs) => {
    const method = args.request.method as ActionMethods;
    const actionCallback = cb[method];
    
    if (!actionCallback) {
      return json(
        { message: `${args.request.method} not allowed` },
        { status: 405 }
      );
    }
    
    const authResult = await AuthenticatorService.isAuthenticated(args.request);
    
    // If not authenticated, isAuthenticated returns a redirect Response
    // For API requests, return JSON error instead of HTML redirect
    if (authResult instanceof Response) {
      if (isApiRequest(args.request)) {
        return json(
          { 
            success: false, 
            error: 'Authentication required. Please refresh the page to log in again.',
            isAuthError: true 
          },
          { status: 401 }
        );
      }
      return authResult;
    }
    
    let user = authResult as User;
    
    try {
      // Ensure token is fresh before making any API calls
      user = await ensureFreshToken(user);
      
      // If token was refreshed, commit the session immediately with Set-Cookie header
      if (user.user.idToken !== (authResult as User).user.idToken) {
        const session = await SessionStorageService.sessionStorage.getSession(
          args.request.headers.get("Cookie")
        );
        session.set("_session", user);
        
        // CRITICAL: Commit session and attach Set-Cookie header to response
        const cookieHeader = await SessionStorageService.sessionStorage.commitSession(session);
        
        // Run the action within user context
        const actionResponse = await runWithUser(user, async () => {
          return await actionCallback({ ...args, user });
        });
        
        // Ensure response is a Response object before setting headers
        if (actionResponse instanceof Response) {
          actionResponse.headers.set("Set-Cookie", cookieHeader);
        }
        return actionResponse;
      }
      
      // No token refresh needed, proceed normally
      return await runWithUser(user, async () => {
        return await actionCallback({ ...args, user });
      });
    } catch (e) {
      // Log error details for debugging
      console.error('[authenticateActionRequest] Error caught:', JSON.stringify({
        errorType: e?.constructor?.name,
        message: e instanceof Error ? e.message : String(e),
        response: e instanceof AxiosError ? {
          status: e.response?.status,
          data: e.response?.data,
          headers: e.response?.headers
        } : undefined,
        stack: e instanceof Error ? e.stack : undefined
      }, null, 2));

      // If token refresh fails (no refresh token or invalid refresh token), handle auth failure
      if (e instanceof Error && (
        e.message === AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID ||
        e.message === AUTH_ERROR_MESSAGES.NO_REFRESH_TOKEN
      )) {
        return await handleAuthFailure(args.request);
      }
      
      // If backend returns 401 (user doesn't exist, session invalid, etc.)
      // Handle auth failure appropriately for API vs browser requests
      if (e instanceof Response && e.status === 401) {
        return await handleAuthFailure(args.request);
      }
      
      // If API call returns 401 via AxiosError
      if (e instanceof AxiosError && e.response?.status === 401) {
        return await handleAuthFailure(args.request);
      }
      
      return json(
        {
          message: (e as AxiosError)?.response?.data ?? "Something Went Wrong",
        },
        { status: (e as AxiosError)?.response?.status ?? 500 }
      );
    }
  };
};
