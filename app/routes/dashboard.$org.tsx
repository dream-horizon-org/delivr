/**
 * Organization Layout Route
 * Fetches tenant info once and shares it with all child routes
 * Eliminates redundant API calls across pages
 */

import { json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { CodepushService } from '~/.server/services/Codepush';
import type { Organisation } from '~/.server/services/Codepush/types';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    // Fetch tenant info once at the layout level
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId
    });

    const organisation = response.data.organisation;

    return json({
      tenantId,
      organisation,
      user
    });
  } catch (error) {
    console.error('[OrgLayout] Error loading tenant info:', error);
    throw new Response('Failed to load organization', { status: 500 });
  }
});

export type OrgLayoutLoaderData = {
  tenantId: string;
  organisation: Organisation;
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

