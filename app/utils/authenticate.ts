import {
  ActionFunction,
  ActionFunctionArgs,
  json,
  LoaderFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { AxiosError } from "axios";
import { AuthenticatorService } from "~/.server/services/Auth/Auth";
import { User } from "~/.server/services/Auth/Auth.interface";

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
    
    const user = authResult as User;
    
    try {
      return (await cb?.({ ...args, user })) ?? user;
    } catch (e) {
      // If it's a Response (like a redirect), re-throw it so Remix handles it properly
      if (e instanceof Response) {
        throw e;
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
    if (!cb[method]) {
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
    
    const user = authResult as User;
    
    try {
      return await cb[method]({ ...args, user });
    } catch (e) {
      // If it's a Response (like a redirect), re-throw it so Remix handles it properly
      if (e instanceof Response) {
        throw e;
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
