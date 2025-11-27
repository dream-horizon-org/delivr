import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { OrgsPage } from "~/components/Pages/components/OrgsPage";
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/app-distribution';
import type { SystemMetadataBackend } from '~/types/system-metadata';

/**
 * Top-level loader for system metadata
 * Fetches global system metadata that doesn't change per tenant
 * This data is available to all child routes via route data
 */
export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
    const response = await CodepushService.getSystemMetadata(user.user.id);
    
    // Enrich with app distribution metadata (same as API route)
    const enrichedData: SystemMetadataBackend = {
      ...response.data,
      appDistribution: {
        availableStoreTypes: STORE_TYPES,
        allowedPlatforms: ALLOWED_PLATFORMS,
      },
    };
    
    return json({
      initialSystemMetadata: enrichedData,
    });
  } catch (error: any) {
    console.error('[DashboardIndex] Error loading system metadata:', error.message);
    // Return empty metadata on error - hooks will handle fallback
    return json({
      initialSystemMetadata: null,
    });
  }
});

export type DashboardIndexLoaderData = {
  initialSystemMetadata: SystemMetadataBackend | null;
};

export default function DashboardIndex() {
  return <OrgsPage />;
}
