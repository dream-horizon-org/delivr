import {
  ActionFunction,
  ActionFunctionArgs,
  json,
  LoaderFunction,
  LoaderFunctionArgs
} from "@remix-run/node";
import { AxiosError } from "axios";
import { AuthenticatorService } from "~/.server/services/Auth";
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

export type AuthenticatedLoaderFunction = (
  args: AuthenticatedRequestArgs<LoaderFunctionArgs>
) => ReturnType<LoaderFunction>;

export const authenticateLoaderRequest = (cb?: AuthenticatedLoaderFunction) => {
  return async (args: LoaderFunctionArgs) => {
    const authResult = await AuthenticatorService.isAuthenticated(args.request);
    
    // If not authenticated, isAuthenticated returns a redirect Response
    // Return it immediately instead of continuing
    if (authResult instanceof Response) {
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
      // If token refresh fails with REFRESH_TOKEN_INVALID, logout
      if (e instanceof Error && e.message === 'REFRESH_TOKEN_INVALID') {
        return await AuthenticatorService.logout(args.request);
      }
      
      // If backend returns 401 (user doesn't exist, session invalid, etc.)
      // Automatically logout and redirect to login
      if (e instanceof Response && e.status === 401) {
        return await AuthenticatorService.logout(args.request);
      }
      
      // If API call returns 401 via AxiosError
      if (e instanceof AxiosError && e.response?.status === 401) {
        return await AuthenticatorService.logout(args.request);
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
    // Return it immediately instead of continuing
    if (authResult instanceof Response) {
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
      // If token refresh fails with REFRESH_TOKEN_INVALID, logout
      if (e instanceof Error && e.message === 'REFRESH_TOKEN_INVALID') {
        return await AuthenticatorService.logout(args.request);
      }
      
      // If backend returns 401 (user doesn't exist, session invalid, etc.)
      // Automatically logout and redirect to login
      if (e instanceof Response && e.status === 401) {
        return await AuthenticatorService.logout(args.request);
      }
      
      // If API call returns 401 via AxiosError
      if (e instanceof AxiosError && e.response?.status === 401) {
        return await AuthenticatorService.logout(args.request);
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
