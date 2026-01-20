import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  // Redirect old route to new route for backward compatibility
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const redirectUrl = `/dashboard/${params.org}/ota/${params.app}/${params.release}${searchParams ? `?${searchParams}` : ""}`;
  return redirect(redirectUrl);
};

