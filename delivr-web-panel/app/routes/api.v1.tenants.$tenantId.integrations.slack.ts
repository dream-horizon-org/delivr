/**
 * Remix API Route: Slack Integration CRUD
 * GET    /api/v1/apps/:appId/integrations/slack    - Fetch integration
 * POST   /api/v1/apps/:appId/integrations/slack    - Create integration
 * PATCH  /api/v1/apps/:appId/integrations/slack    - Update integration
 * DELETE /api/v1/apps/:appId/integrations/slack    - Delete integration
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
} from '~/utils/authenticate';
import { SlackIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { User } from '~/.server/services/Auth/auth.interface';
import { logApiError } from '~/utils/api-route-helpers';

/**
 * GET - Fetch Slack integration for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    if (!appId) {
      return json({ error: 'app id required' }, { status: 400 });
    }

    try {
      const result = await SlackIntegrationService.getIntegration(
        appId,
        user.user.id
      );

      if (!result.success) {
        return json({ integration: null }, { status: 200 });
      }

      return json(result);
    } catch (error) {
      logApiError('[Slack-Get]', error);
      return json(
        {
          error: error instanceof Error ? error.message : 'Failed to get Slack integration',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Create Slack integration
 */
const createSlackIntegration = async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
  const appId = params.appId;
  if (!appId) {
    return json({ error: 'app id required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { botToken, botUserId, workspaceId, workspaceName, _encrypted } = body;

    // Only botToken is required - channels are configured in Release Config
    if (!botToken) {
      return json(
        {
          success: false,
          error: 'botToken is required'
        },
        { status: 400 }
      );
    }

    console.log(`[Slack-Create] Creating integration for tenant: ${appId}, _encrypted: ${_encrypted}`);
    console.log(`[Slack-Create] Workspace: ${workspaceName}`);

    const result = await SlackIntegrationService.createOrUpdateIntegration({
      appId,
      botToken,
      botUserId,
      workspaceId,
      workspaceName,
      channels: [], // Empty channels - will be configured in Release Config
      userId: user.user.id,
      _encrypted, // Forward encryption flag to backend
    });

    console.log(`[Slack-Create] Result:`, result.success ? 'Success' : 'Failed');

    return json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    logApiError('[Slack-Create]', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Slack integration',
      },
      { status: 500 }
    );
  }
};

/**
 * PATCH - Update Slack integration
 */
const updateSlackIntegration = async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
  const appId = params.appId;
  if (!appId) {
    return json({ error: 'app id required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { botToken, botUserId, workspaceId, workspaceName, channels, _encrypted } = body;

    console.log(`[Slack-Update] Updating integration for tenant: ${appId}, _encrypted: ${_encrypted}`);

    const result = await SlackIntegrationService.updateIntegration({
      appId,
      botToken,
      botUserId,
      workspaceId,
      workspaceName,
      channels,
      userId: user.user.id,
      _encrypted, // Forward encryption flag to backend
    });

    return json(result);
  } catch (error) {
    logApiError('[Slack-Update]', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update Slack integration',
      },
      { status: 500 }
    );
  }
};

/**
 * DELETE - Delete Slack integration
 */
const deleteSlackIntegration = async ({ params, user }: ActionFunctionArgs & { user: User }) => {
  const appId = params.appId;
  if (!appId) {
    return json({ error: 'app id required' }, { status: 400 });
  }

  try {
    console.log(`[Slack-Delete] Deleting integration for tenant: ${appId}`);

    const response = await SlackIntegrationService.deleteIntegration(appId, user.user.id);

    console.log(`[Slack-Delete] Response:`, response);

    return json(response);
  } catch (error) {
    logApiError('[Slack-Delete]', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete Slack integration',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createSlackIntegration,
  PATCH: updateSlackIntegration,
  DELETE: deleteSlackIntegration,
});


