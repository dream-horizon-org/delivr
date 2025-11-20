/**
 * BFF API Route: Get Tenant Information
 * GET /api/v1/tenants/:tenantId
 */

import { json } from '@remix-run/node';
import {
  authenticateLoaderRequest,
  type AuthenticatedLoaderFunction,
} from '~/utils/authenticate';
import { CodepushService } from '~/.server/services/Codepush';

const getTenantInfo: AuthenticatedLoaderFunction = async ({ params, user }) => {
  const tenantId = params.tenantId;
  
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    console.log(`[BFF-TenantInfo] Fetching tenant info for: ${tenantId}, userId: ${user.user.id}`);
    
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId,
    });

    console.log(`[BFF-TenantInfo] Successfully fetched tenant info`);
    
    return json(response.data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[BFF-TenantInfo] Error fetching tenant info:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch tenant info',
      },
      { status: 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getTenantInfo);

