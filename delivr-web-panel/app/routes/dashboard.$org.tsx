/**
 * App Layout Route
 * Fetches app info once and shares it with all child routes
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
import type { App } from '~/.server/services/Codepush/types';
import type { TenantConfig, SystemMetadataBackend } from '~/types/system-metadata';
import {
  DEFAULT_EMPTY_CONNECTED_INTEGRATIONS,
  DEFAULT_RELEASE_MANAGEMENT,
} from '~/constants/app-layout.constants';

export const loader = authenticateLoaderRequest(async ({ request, params, user }) => {
  const { org: appId } = params; // Route param is still $org for now, but we treat it as appId

  if (!appId) {
    throw new Response('App not found', { status: 404 });
  }

  try {
    // Fetch app info via BFF API route (using new /apps endpoint)
    const apiUrl = new URL(request.url);
    const result = await apiGet<{ 
      app?: App; 
      organisation?: App; // Legacy field, now uses App type
      appDistributions?: any[] 
    }>(
      `${apiUrl.origin}/api/v1/apps/${appId}`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      }
    );
    
    // Handle both new format (app) and legacy format (organisation)
    // Both now use the App type, so we can use either
    const app = result.data?.app || result.data?.organisation || null;

    if (!app) {
      throw new Error('App not found in response');
    }

    // Extract app config from app response (check both app and organisation for backward compatibility)
    const config = result.data?.app?.releaseManagement?.config || result.data?.organisation?.releaseManagement?.config;
    const initialAppConfig: TenantConfig | null = config
      ? {
          appId,
          organization: {
            id: app.id,
            name: app.displayName,
          },
          releaseManagement: {
            connectedIntegrations:
              config.connectedIntegrations ?? DEFAULT_EMPTY_CONNECTED_INTEGRATIONS,
            enabledPlatforms:
              config.enabledPlatforms ?? DEFAULT_RELEASE_MANAGEMENT.enabledPlatforms,
            enabledTargets:
              config.enabledTargets ?? DEFAULT_RELEASE_MANAGEMENT.enabledTargets,
            allowedReleaseTypes:
              config.allowedReleaseTypes ??
              DEFAULT_RELEASE_MANAGEMENT.allowedReleaseTypes,
          },
        }
      : null;

    // Return with no-cache headers to ensure fresh data
    return json({
      appId,
      app,
      user,
      initialAppConfig,
      // Legacy fields for backward compatibility // Use app if organisation not present
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    const errorMessage = getApiErrorMessage(error, 'Failed to load app');
    console.error('[AppLayout] Error loading app info:', errorMessage);
    throw new Response(errorMessage, { status: 500 });
  }
});

export type AppLayoutLoaderData = {
  appId: string;
  app: App;
  user: any;
  initialAppConfig: TenantConfig | null;
  // Legacy fields for backward compatibility
};

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use AppLayoutLoaderData instead
 */
export type OrgLayoutLoaderData = AppLayoutLoaderData;

/**
 * Layout component that renders child routes
 * Child routes can access this data via:
 * const { app } = useRouteLoaderData<AppLayoutLoaderData>('routes/dashboard.$org');
 */
/**
 * Control revalidation behavior for parent route
 * ONLY revalidate on navigation - never on actions from child routes
 * Uses the same strategy as the root dashboard route
 */
export { shouldRevalidate } from './dashboard';

export default function AppLayout() {
  const { appId, initialAppConfig } = useLoaderData<AppLayoutLoaderData>();
  
  // Get system metadata from dashboard.tsx loader (parent layout)
  // This allows system metadata to be fetched at top level and shared
  const dashboardData = useRouteLoaderData<{ initialSystemMetadata: SystemMetadataBackend | null }>('routes/dashboard');
  const initialSystemMetadata = dashboardData?.initialSystemMetadata;
  
  return (
    <ConfigProvider
      appId={appId} // ConfigProvider still uses appId internally
      initialSystemMetadata={initialSystemMetadata}
      initialAppConfig={initialAppConfig }
    >
      <Outlet />
    </ConfigProvider>
  );
}

/**
 * Legacy component name for backward compatibility
 * @deprecated Use AppLayout instead
 */
export const OrgLayout = AppLayout;
