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

  // Safety check for user object
  if (!user || !user.user || !user.user.id) {
    console.error('[BFF-TenantInfo] Invalid user object:', user);
    return json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    console.log(`[BFF-TenantInfo] Fetching tenant info for: ${tenantId}, userId: ${user.user.id}`);
    
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId,
    });

    console.log(`[BFF-TenantInfo] Successfully fetched tenant info`);
    console.log(`[BFF-TenantInfo] Response data:`, JSON.stringify(response.data, null, 2));
    
    return json(response.data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[BFF-TenantInfo] Error fetching tenant info:');
    console.error('[BFF-TenantInfo] Error type:', error?.constructor?.name);
    console.error('[BFF-TenantInfo] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[BFF-TenantInfo] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[BFF-TenantInfo] Full error:', error);
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

