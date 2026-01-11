import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  AuthenticatorService,
  SocialsProvider,
} from "~/.server/services/Auth";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // Trigger OAuth authentication flow on GET request
  return AuthenticatorService.authenticate(
    params.provider as SocialsProvider,
    request
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  return AuthenticatorService.authenticate(
    params.provider as SocialsProvider,
    request
  );
};
