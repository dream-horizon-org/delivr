import { useSubmit, useSearchParams } from "@remix-run/react";
import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { AuthenticatorService } from "~/.server/services/Auth";
import { LoginForm } from "~/components/Pages/Login";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Check if user is already authenticated - if so, redirect to dashboard
  // If not authenticated, just return empty response (don't redirect)
  try {
    const userResult = await AuthenticatorService.getUser(request);
    if (userResult.user) {
      // User is authenticated, redirect to dashboard
      return redirect("/dashboard");
    }
  } catch (error) {
    // User is not authenticated, which is fine for login page
    // Just return empty response
  }
  
  // User is not authenticated - allow them to see login page
  return json({});
};

export default function AuthenticationForm() {
  const submit = useSubmit();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  const login = () => {
    submit(null, {
      method: "post",
      action: `/auth/google`,
    });
  };

  return <LoginForm onClickLogin={login} error={error} />;
}
