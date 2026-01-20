/**
 * Release Management Dashboard (Legacy Route)
 * This route now redirects to /releases which is the new home for the dashboard
 * 
 * Kept for backward compatibility - all traffic should go to /releases
 */

import { redirect } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(async ({ params }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Redirect to the new unified releases route
  return redirect(`/dashboard/${org}/releases`);
});

export default function ReleaseDashboardPageRedirect() {
  // This component should never render due to loader redirect
  return null;
}
