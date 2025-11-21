import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";

import { SessionStorageService } from "../SessionStorage";

import { getAuthenticatorCallbackUrl } from "./Auth.utils";
import { AuthenticatorRoutes, User, UserReturnType } from "./Auth.interface";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  TypedResponse,
} from "@remix-run/node";
import { env } from "../config";
import { CodepushService } from "../Codepush";
import { redirectTo } from "../Cookie";

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
          clientID: env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
          callbackURL: getAuthenticatorCallbackUrl(SocialsProvider.GOOGLE),
          prompt: "consent",
        },
        async (args) => {
          console.log("args in constructing Auth:", args);
          try {
            return await CodepushService.getUser(args.extraParams.id_token);
          } catch (error: any) {
            console.error("Error fetching user from backend:", error);
            
            // Provide better error messages
            if (error?.code === "ECONNREFUSED") {
              throw new Error("Cannot connect to backend server. Please ensure the server is running on " + env.DELIVR_BACKEND_URL);
            } else if (error?.response?.status === 401) {
              throw new Error("Invalid authentication token");
            } else if (error?.response?.status === 404) {
              throw new Error("User not found");
            } else if (error?.message) {
              throw new Error(error.message);
            }
            
            throw new Error("Failed to authenticate with backend server");
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
      console.error("Authentication error:", error);
      
      // If it's a Response object with status 302, it's actually a success redirect
      if (error instanceof Response && error.status === 302) {
        console.log("Authentication successful, following redirect");
        return error;
      }
      
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
