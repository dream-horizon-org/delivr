/**
 * BFF API Route: App Distribution Integrations
 * Proxies to backend /integrations/store/* endpoints
 * 
 * GET    /api/v1/tenants/:tenantId/distributions           - List all distributions
 * POST   /api/v1/tenants/:tenantId/distributions/verify    - Verify credentials
 * POST   /api/v1/tenants/:tenantId/distributions           - Connect/Create distribution
 * DELETE /api/v1/tenants/:tenantId/distributions/:id       - Delete distribution
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import type {
  AppDistributionConnectRequest,
  AppDistributionVerifyRequest,
} from '~/types/app-distribution';

/**
 * GET - List all distributions for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const result = await AppDistributionService.listIntegrations(tenantId, user.user.id);
      return json(result);
    } catch (error) {
      console.error('[BFF-AppDistribution-List] Error:', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch distributions',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Verify credentials or Connect store
 */
const postDistributionAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const isVerify = url.searchParams.get('action') === 'verify';

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    if (isVerify) {
      // Verify credentials
      // Validate required fields
      if (!body.storeType || !body.platform || !body.payload) {
        return json(
          {
            success: false,
            error: 'storeType, platform, and payload are required',
          },
          { status: 400 }
        );
      }
      
      const result = await AppDistributionService.verifyStore(tenantId, user.user.id, body);
      return json(result);
    } else {
      // Connect/Create store integration
      
      // Validate required fields
      if (!body.storeType || !body.platform || !body.payload) {
        return json(
          {
            success: false,
            error: 'storeType, platform, and payload are required',
          },
          { status: 400 }
        );
      }

      const result = await AppDistributionService.connectStore(tenantId, user.user.id, body);
      
      return json(result, { status: result.success ? 201 : 500 });
    }
  } catch (error) {
    console.error('[BFF-AppDistribution-Post] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 }
    );
  }
};

/**
 * DELETE - Revoke/Delete distribution
 */
const deleteDistributionAction = async ({
  params,
  request,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const storeType = url.searchParams.get('storeType');
  const platform = url.searchParams.get('platform');

  if (!tenantId || !storeType || !platform) {
    return json({ success: false, error: 'Tenant ID, storeType, and platform required' }, { status: 400 });
  }

  try {
    const result = await AppDistributionService.revokeIntegration(
      tenantId, 
      storeType as any, 
      platform as any, 
      user.user.id
    );
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-AppDistribution-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke distribution',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: postDistributionAction,
  DELETE: deleteDistributionAction,
});

