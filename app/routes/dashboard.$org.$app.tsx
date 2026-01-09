import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  // Redirect old route to new route for backward compatibility
  return redirect(`/dashboard/${params.org}/ota/${params.app}`);
};

