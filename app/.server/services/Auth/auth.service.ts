import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";

import { SessionStorageService } from "../SessionStorage";

import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  TypedResponse,
} from "@remix-run/node";
import { CodepushService } from "../Codepush";
import { redirectTo } from "../Cookie";
import { AUTH_CONFIG } from "./auth.constants";
import { AuthenticatorRoutes, User, UserReturnType } from "./auth.interface";
import {
  getAuthenticatorCallbackUrl,
  getAuthErrorMessage,
  getBackendURL
} from "./auth.utils";
import { ensureFreshToken } from "./token-refresh";

export enum SocialsProvider {
  GOOGLE = "google",
}

type AuthRequest =
  | LoaderFunctionArgs["request"]
  | ActionFunctionArgs["request"];

export class Auth {
  static authenticator = new Authenticator<User>(
    SessionStorageService.sessionStorage,
    {
      sessionKey: SessionStorageService.sessionKey,
    }
  );

  constructor() {
    Auth.authenticator.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          callbackURL: getAuthenticatorCallbackUrl(SocialsProvider.GOOGLE),
          accessType: AUTH_CONFIG.OAUTH_ACCESS_TYPE,
          prompt: AUTH_CONFIG.OAUTH_PROMPT,
        },
        async (args) => {
          try {
            // Validate required OAuth parameters
            if (!args.extraParams.id_token) {
              throw new Error('Missing ID token from Google OAuth response');
            }
            
            const user = await CodepushService.getUser(args.extraParams.id_token);
            
            return {
              ...user,
              user: {
                ...user.user,
                idToken: args.extraParams.id_token,
                refreshToken: args.extraParams.refresh_token ? String(args.extraParams.refresh_token) : null,
                tokenExpiresAt: Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_MS
              }
            };
          } catch (error: any) {
            console.error("[Auth] Failed to authenticate:", {
              error: error?.message,
              status: error?.response?.status,
              backend: getBackendURL(),
            });
            
            // Get error message with backend URL included for better debugging
            throw new Error(getAuthErrorMessage(error, true));
          }
        }
      )
    );
  }

  async getUser(request: AuthRequest): Promise<UserReturnType> {
    const session = await SessionStorageService.sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    const user = session.get("_session") ?? null;

    // If user exists, ensure token is fresh
    if (user) {
      try {
        const freshUser = await ensureFreshToken(user);
        
        // Update session if token was refreshed
        if (freshUser !== user) {
          session.set("_session", freshUser);
          console.log('[Auth] Token was refreshed, session updated');
        }
        
        return { user: freshUser, session };
      } catch (error) {
        console.error("Error refreshing token:", error);
        
        // Token refresh failed, clear session and redirect to login
        session.unset("_session");
        const cookieHeader =
          await SessionStorageService.sessionStorage.commitSession(session);
        return {
          redirect: true,
          url: AuthenticatorRoutes.LOGIN,
          cookieHeader,
        };
      }
    }

    return { user: null, session };
  }

  async callback(provider: SocialsProvider, request: AuthRequest) {
    try {
      const redirectUri = await redirectTo.parse(request.headers.get("Cookie"));
      console.log("redirectUri:", redirectUri, request.headers.get("Cookie"));
      return await Auth.authenticator.authenticate(provider, request, {
        successRedirect: redirectUri ?? "/dashboard",
      });
    } catch (error: any) {
      // If it's a Response object with status 302, it's actually a success redirect (not an error)
      if (error instanceof Response && error.status === 302) {
        console.log("Authentication successful, following redirect to:", error.headers.get("Location"));
        return error;
      }
      
      // This is an actual error
      console.error("Authentication error:", error);
      
      // Get user-friendly error message using utility function
      const errorMessage = getAuthErrorMessage(error);
      
      // Redirect to login with error message
      return redirect(`${AuthenticatorRoutes.LOGIN}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  async authenticate(provider: SocialsProvider, request: AuthRequest) {
    return Auth.authenticator.authenticate(provider, request);
  }

  async isAuthenticated(
    request: AuthRequest
  ): Promise<User | TypedResponse<never>> {
    const apiKey = request.headers.get("api-key") ?? "";

    if (apiKey.length) {
      try {
        const { data } = await CodepushService.getUserByAccessKey(apiKey);
        const userWithAuth = { ...data, authenticated: true };
        
        // Ensure token is fresh for API key users too
        const freshUser = await ensureFreshToken(userWithAuth);
        return freshUser;
      } catch (error) {
        console.error("[Auth] Failed to authenticate with API key:", error);
        // If token refresh fails, return the user anyway for API key auth
        const { data } = await CodepushService.getUserByAccessKey(apiKey);
        return { ...data, authenticated: true };
      }
    }

    try {
      return await Auth.authenticator.authenticate(
        SocialsProvider.GOOGLE,
        request,
        {
          throwOnError: true,
        }
      );
    } catch (e) {
      // OAuth redirects (302) are normal flow, not errors - don't log them
      // Only log actual authentication errors
      if (e instanceof Response && e.status !== 302) {
        console.error("[Auth] Authentication failed:", e.status, e.statusText);
      } else if (!(e instanceof Response)) {
        console.error("[Auth] Authentication error:", e);
      }
      
      return redirect(AuthenticatorRoutes.LOGIN, {
        headers: {
          "Set-Cookie": await redirectTo.serialize(
            new URL(request.url).pathname
          ),
        },
      });
    }
  }

  async isLoggedIn(request: AuthRequest) {
    return await Auth.authenticator.isAuthenticated(request, {
      successRedirect: "/dashboard",
    });
  }

  async logout(request: AuthRequest) {
    return await Auth.authenticator.logout(request, {
      redirectTo: AuthenticatorRoutes.LOGIN,
    });
  }
}

const AuthenticatorService = new Auth();

export { AuthenticatorService };
