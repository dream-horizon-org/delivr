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
import type { User } from '~/.server/services/Auth/auth.interface';
import type { TenantConfig, SystemMetadataBackend, AppSetupStatus } from '~/types/system-metadata';
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
    // Fetch app info via BFF API route (new shape: app, platformTargets, integrations, allowedReleaseTypes, setupStatus)
    const apiUrl = new URL(request.url);
    const result = await apiGet<{
      app?: { id: string; displayName?: string; [key: string]: unknown };
      organisation?: { id: string; displayName?: string; [key: string]: unknown };
      platformTargets?: Array<{ platform: string; target: string }>;
      integrations?: Record<string, unknown>;
      allowedReleaseTypes?: string[];
      setupStatus?: AppSetupStatus;
      appDistributions?: unknown[];
    }>(
      `${apiUrl.origin}/api/v1/apps/${appId}`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      }
    );

    const data = result.data;
    const appPayload = data?.app ?? data?.organisation ?? null;
    if (!appPayload || typeof appPayload !== 'object') {
      throw new Error('App not found in response');
    }

    const platformTargets: Array<{ platform: string; target: string }> = Array.isArray(data?.platformTargets)
      ? data.platformTargets
      : [];

    const setupStatus = data?.setupStatus as AppSetupStatus | undefined;

    const enabledPlatforms = platformTargets.length > 0 ? [...new Set(platformTargets.map((pt) => pt.platform))] : [];
    const enabledTargets = platformTargets.length > 0 ? [...new Set(platformTargets.map((pt) => pt.target))] : [];
    const hasDotaTarget = platformTargets.some((pt) => pt.target === 'DOTA');

    const connectedIntegrations =
      (data?.integrations as TenantConfig['connectedIntegrations']) ??
      DEFAULT_EMPTY_CONNECTED_INTEGRATIONS;
    const allowedReleaseTypes =
      (data?.allowedReleaseTypes as string[] | undefined) ?? DEFAULT_RELEASE_MANAGEMENT.allowedReleaseTypes;

    const initialAppConfig: TenantConfig | null = {
      appId,
      organization: { id: '', name: '' },
      connectedIntegrations,
      enabledPlatforms,
      enabledTargets,
      allowedReleaseTypes,
      hasDotaTarget,
    };

    const app = appPayload as App;

    // Gate: redirect to onboarding when setup not complete, or to releases when on onboarding but already complete
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isOnboardingPath = pathname.includes('/onboarding');

    if (setupStatus) {
      if (!setupStatus.completed && !isOnboardingPath) {
        const stepParam = typeof setupStatus.step === 'number' ? `?step=${setupStatus.step}` : '';
        throw new Response(null, {
          status: 302,
          headers: { Location: `/dashboard/${appId}/onboarding${stepParam}` },
        });
      }
      if (setupStatus.completed && isOnboardingPath) {
        throw new Response(null, {
          status: 302,
          headers: { Location: `/dashboard/${appId}/releases` },
        });
      }
    }

    // Return with no-cache headers to ensure fresh data
    return json({
      appId,
      app,
      user,
      platformTargets,
      initialAppConfig,
      setupStatus: setupStatus ?? null,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    // Rethrow redirect Responses (e.g. to onboarding) so Remix can perform the redirect
    if (error instanceof Response) {
      throw error;
    }
    const errorMessage = getApiErrorMessage(error, 'Failed to load app');
    console.error('[AppLayout] Error loading app info:', errorMessage);
    throw new Response(errorMessage, { status: 500 });
  }
});

export type AppLayoutLoaderData = {
  appId: string;
  app: App;
  user: User;
  platformTargets: Array<{ platform: string; target: string }>;
  initialAppConfig: TenantConfig | null;
  setupStatus: AppSetupStatus | null;
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
 * Control revalidation behavior for app layout route.
 * Revalidate on navigation OR when explicitly triggered (e.g. sidebar save name/platform targets)
 * so GET /api/v1/apps/:appId is refetched and UI reflects immediately.
 */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultReason,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultReason: string;
}): boolean {
  if (currentUrl.pathname !== nextUrl.pathname) return true;
  if (defaultReason === 'revalidate') return true;
  return false;
}

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
