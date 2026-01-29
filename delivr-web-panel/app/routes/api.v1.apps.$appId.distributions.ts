/**
 * BFF API Route: App Distribution Integrations
 * Proxies to backend /integrations/store/* endpoints
 * 
 * GET    /api/v1/apps/:appId/distributions           - List all distributions
 * POST   /api/v1/apps/:appId/distributions/verify    - Verify credentials
 * POST   /api/v1/apps/:appId/distributions           - Connect/Create distribution
 * DELETE /api/v1/apps/:appId/distributions/:id       - Delete distribution
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/auth.interface';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import { authenticateActionRequest, authenticateLoaderRequest } from '~/utils/authenticate';

/**
 * GET - List all distributions for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;

    if (!appId) {
      return json({ success: false, error: 'app id required' }, { status: 400 });
    }

    try {
      const result = await AppDistributionService.listIntegrations(appId, user.user.id);
      return json(result);
    } catch (error) {
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
  const appId = params.appId;
  const url = new URL(request.url);
  const isVerify = url.searchParams.get('action') === 'verify';

  if (!appId) {
    return json({ success: false, error: 'app id required' }, { status: 400 });
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
      
      const result = await AppDistributionService.verifyStore(appId, user.user.id, body);
      
      // Transform backend response to match API client expectations
      // Backend returns: {success, verified, message, details}
      // API client expects: {success, data: {verified, message, details}}
      if (result.success) {
        return json({
          success: true,
          data: {
            verified: result.verified,
            message: result.message,
            details: result.details,
          },
        });
      } else {
        return json({
          success: false,
          error: result.message || 'Verification failed',
          data: result.details,
        }, { status: 400 });
      }
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
      const result = await AppDistributionService.connectStore(appId, user.user.id, body);
      
      return json(result, { status: result.success ? 201 : 500 });
    }
  } catch (error) {
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
 * PATCH - Update distribution
 */
const patchDistributionAction = async ({
  params,
  request,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const appId = params.appId;
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  if (!appId || !integrationId) {
    return json({ success: false, error: 'app id and integration ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.payload) {
      return json(
        {
          success: false,
          error: 'payload is required',
        },
        { status: 400 }
      );
    }
    
    const result = await AppDistributionService.updateStore(
      appId,
      integrationId,
      body.payload,
      user.user.id
    );
    
    return json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update distribution',
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
  const appId = params.appId;
  const url = new URL(request.url);
  const storeType = url.searchParams.get('storeType');
  const platform = url.searchParams.get('platform');

  if (!appId || !storeType || !platform) {
    return json({ success: false, error: 'app id, storeType, and platform required' }, { status: 400 });
  }

  try {
    const result = await AppDistributionService.revokeIntegration(
      appId, 
      storeType as any, 
      platform as any, 
      user.user.id
    );
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
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
  PATCH: patchDistributionAction,
  DELETE: deleteDistributionAction,
});

