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
import { AUTH_CONFIG, AUTH_ERROR_MESSAGES } from "./auth.constants";
import { AuthenticatorRoutes, User, UserReturnType } from "./auth.interface";
import {
  getAuthenticatorCallbackUrl,
  getBackendURL,
  isBackendConnectionError
} from "./auth.utils";

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
            
            if (isBackendConnectionError(error)) {
              throw new Error(`${AUTH_ERROR_MESSAGES.BACKEND_UNREACHABLE} on ${getBackendURL()}`);
            }
            
            if (error?.response?.status === 401) {
              throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
            }
            
            if (error?.response?.status === 404) {
              throw new Error(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
            }
            
            throw new Error(error?.message || AUTH_ERROR_MESSAGES.AUTHENTICATION_FAILED);
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

    if (user) {
      try {
        const currentUser = "hello";
        session.set("_session", currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
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

    return { user: session.get("_session") ?? null, session };
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
      
      // Extract meaningful error message
      let errorMessage = "Authentication failed";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.cause?.message) {
        errorMessage = error.cause.message;
      }
      
      // Check if backend is unreachable
      if (error?.code === "ECONNREFUSED" || error?.message?.includes("ECONNREFUSED")) {
        errorMessage = "Cannot connect to backend server. Please ensure the server is running.";
      } else if (error?.code === "ENOTFOUND" || error?.message?.includes("ENOTFOUND")) {
        errorMessage = "Backend server not found. Please check your configuration.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Authentication failed. Please try again.";
      } else if (error?.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      }
      
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
      const { data } = await CodepushService.getUserByAccessKey(apiKey);
      return { ...data, authenticated: true };
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
