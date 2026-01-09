/**
 * Organization Layout Route
 * Fetches tenant info once and shares it with all child routes
 * Eliminates redundant API calls across pages
 * 
 * IMPORTANT: Always fetches fresh data (no caching) to ensure
 * release management setup status is up-to-date
 */

import { json } from '@remix-run/node';
import { Outlet, useLoaderData, useRouteLoaderData } from '@remix-run/react';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import { ConfigProvider } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import type { Organization } from '~/.server/services/Codepush/types';
import type { TenantConfig } from '~/types/system-metadata';
import type { SystemMetadataBackend } from '~/types/system-metadata';

export const loader = authenticateLoaderRequest(async ({ request, params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    // Fetch tenant info via BFF API route
    const apiUrl = new URL(request.url);
    const result = await apiGet<{ organisation: Organization; appDistributions?: any[] }>(
      `${apiUrl.origin}/api/v1/tenants/${tenantId}`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      }
    );

    const organisation = result.data?.organisation;

    if (!organisation) {
      throw new Error('Organization not found in response');
    }


    // Extract tenant config from organisation response
    const config = organisation?.releaseManagement?.config;
    const initialTenantConfig: TenantConfig | null = config ? {
      tenantId,
      organization: {
        id: organisation.id,
        name: organisation.displayName,
      },
      releaseManagement: {
        connectedIntegrations: config.connectedIntegrations || {
          SOURCE_CONTROL: [],
          COMMUNICATION: [],
          CI_CD: [],
          TEST_MANAGEMENT: [],
          PROJECT_MANAGEMENT: [],
          APP_DISTRIBUTION: [],
        },
        enabledPlatforms: config.enabledPlatforms || [],
        enabledTargets: config.enabledTargets || [],
        allowedReleaseTypes: config.allowedReleaseTypes || [],
      },
    } : null;

    // Return with no-cache headers to ensure fresh data
    return json({
      tenantId,
      organisation,
      user,
      initialTenantConfig,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    const errorMessage = getApiErrorMessage(error, 'Failed to load organization');
    console.error('[OrgLayout] Error loading tenant info:', errorMessage);
    throw new Response(errorMessage, { status: 500 });
  }
});

export type OrgLayoutLoaderData = {
  tenantId: string;
  organisation: Organization;
  user: any;
  initialTenantConfig: TenantConfig | null;
};

/**
 * Layout component that renders child routes
 * Child routes can access this data via:
 * const { organisation } = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
 */
export default function OrgLayout() {
  const { tenantId, initialTenantConfig } = useLoaderData<OrgLayoutLoaderData>();
  
  // Get system metadata from dashboard.tsx loader (parent layout)
  // This allows system metadata to be fetched at top level and shared
  const dashboardData = useRouteLoaderData<{ initialSystemMetadata: SystemMetadataBackend | null }>('routes/dashboard');
  const initialSystemMetadata = dashboardData?.initialSystemMetadata;
  
  return (
    <ConfigProvider
      tenantId={tenantId}
      initialSystemMetadata={initialSystemMetadata}
      initialTenantConfig={initialTenantConfig}
    >
      <Outlet />
    </ConfigProvider>
  );
}

