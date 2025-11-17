/**
 * Organization Layout Route
 * Fetches tenant info once and shares it with all child routes
 * Eliminates redundant API calls across pages
 * 
 * IMPORTANT: Always fetches fresh data (no caching) to ensure
 * release management setup status is up-to-date
 */

import { json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { CodepushService } from '~/.server/services/Codepush';
import type { Organization } from '~/.server/services/Codepush/types';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    // Fetch tenant info once at the layout level
    // This includes release management setup status and integrations
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId
    });

    console.log('response', response.data?.organisation?.releaseManagement?.integrations);

    const organisation = response.data.organisation;

    // Return with no-cache headers to ensure fresh data
    return json({
      tenantId,
      organisation,
      user
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[OrgLayout] Error loading tenant info:', error);
    throw new Response('Failed to load organization', { status: 500 });
  }
});

export type OrgLayoutLoaderData = {
  tenantId: string;
  organisation: Organization;
  user: any;
};

/**
 * Layout component that renders child routes
 * Child routes can access this data via:
 * const { organisation } = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
 */
export default function OrgLayout() {
  // Just render child routes - data is available via useRouteLoaderData
  return <Outlet />;
}

