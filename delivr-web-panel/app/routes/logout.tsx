// routes/logout.tsx
import { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { AuthenticatorService } from "~/.server/services/Auth";

// Redirect users who try to access this route with a GET request
export const loader = ({ request }: LoaderFunctionArgs) => {
  return AuthenticatorService.isLoggedIn(request);
};

// Handle the POST request to log out the user
// The authenticator.logout() already clears the session cookie and redirects
// Additional cookie clearing is handled client-side in AuthErrorFallback
export const action: ActionFunction = async ({ request }) => {
  return await AuthenticatorService.logout(request);
};
