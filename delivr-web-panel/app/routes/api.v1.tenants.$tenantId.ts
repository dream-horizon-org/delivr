/**
 * BFF API Route: Get Tenant Information
 * GET /api/v1/tenants/:tenantId
 */

import { json } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import {
  authenticateLoaderRequest,
  type AuthenticatedLoaderFunction,
} from '~/utils/authenticate';
import { logApiError } from '~/utils/api-route-helpers';

const getTenantInfo: AuthenticatedLoaderFunction = async ({ params, user }) => {
  const tenantId = params.tenantId;
  
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  // Safety check for user object
  if (!user || !user.user || !user.user.id) {
    console.error('[BFF-TenantInfo] Invalid user object:', user);
    return json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    console.log(`[BFF-TenantInfo] Fetching tenant info for: ${tenantId}, userId: ${user.user.id}`);
    
    // Fetch base tenant info
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId,
    });

    // Fetch app distribution integrations
    const distributionsResponse = await AppDistributionService.listIntegrations(tenantId, user.user.id);
    // Flatten the grouped data into a single array
    const distributions = distributionsResponse.success && distributionsResponse.data
      ? [...(distributionsResponse.data.IOS || []), ...(distributionsResponse.data.ANDROID || [])]
      : [];

    console.log(`[BFF-TenantInfo] Successfully fetched tenant info with ${distributions.length} distributions`);
    
    // Enrich the response with app distribution data
    const enrichedData = {
      ...response.data,
      appDistributions: distributions,
    };
    
    // Return with proper API client structure
    return json({
      success: true,
      data: enrichedData,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logApiError('[BFF-TenantInfo]', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch tenant info',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getTenantInfo);

