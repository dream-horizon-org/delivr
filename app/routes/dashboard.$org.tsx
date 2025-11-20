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
import { ConfigProvider } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import type { Organization } from '~/.server/services/Codepush/types';

export const loader = authenticateLoaderRequest(async ({ request, params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    // Fetch tenant info via BFF API route
    const apiUrl = new URL(request.url);
    const response = await fetch(`${apiUrl.origin}/api/v1/tenants/${tenantId}`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tenant info: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('response', data?.organisation?.releaseManagement?.config);

    const organisation = data.organisation;

    // 🔧 HARDCODED: Override setupComplete to always be true for development
    if (organisation?.releaseManagement) {
      organisation.releaseManagement.setupComplete = true;
    }

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
  // Wrap child routes with ConfigProvider to fetch and provide system metadata
  const { tenantId } = useLoaderData<OrgLayoutLoaderData>();
  
  return (
    <ConfigProvider tenantId={tenantId}>
      <Outlet />
    </ConfigProvider>
  );
}

