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
    if (isVerify) {
      // Verify credentials
      const body: AppDistributionVerifyRequest = await request.json();
      const result = await AppDistributionService.verifyStore(tenantId, user.user.id, body);
      return json(result);
    } else {
      // Connect/Create store integration
      const body: AppDistributionConnectRequest = await request.json();
      
      // Validate required fields
      if (!body.storeType || !body.platforms || body.platforms.length === 0 || !body.payload) {
        return json(
          {
            success: false,
            error: 'storeType, platforms, and payload are required',
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
 * DELETE - Delete distribution
 */
const deleteDistributionAction = async ({
  params,
  request,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  if (!tenantId || !integrationId) {
    return json({ success: false, error: 'Tenant ID and Integration ID required' }, { status: 400 });
  }

  try {
    const result = await AppDistributionService.deleteIntegration(tenantId, integrationId, user.user.id);
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-AppDistribution-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete distribution',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: postDistributionAction,
  DELETE: deleteDistributionAction,
});

