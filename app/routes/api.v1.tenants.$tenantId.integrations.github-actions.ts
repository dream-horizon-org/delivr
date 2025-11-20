/**
 * BFF Route: GitHub Actions Integration
 * Handles GitHub Actions CI/CD integration API calls
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { GitHubActionsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

/**
 * GET - Get GitHub Actions integration for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const service = new GitHubActionsIntegrationService();
      const result = await service.getIntegration(tenantId, user.user.id);

      return json(result);
    } catch (error) {
      console.error('[BFF-GitHubActions-Get] Error:', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get GitHub Actions integration',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Create GitHub Actions integration
 * DELETE - Delete GitHub Actions integration
 * PATCH - Update GitHub Actions integration
 */
const createGitHubActionsAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new GitHubActionsIntegrationService();

    const result = await service.createIntegration(tenantId, user.user.id, {
      displayName: body.displayName,
      apiToken: body.apiToken,
      hostUrl: body.hostUrl,
    });

    return json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('[BFF-GitHubActions-Create] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create GitHub Actions integration',
      },
      { status: 500 }
    );
  }
};

const deleteGitHubActionsAction = async ({
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const service = new GitHubActionsIntegrationService();
    const result = await service.deleteIntegration(tenantId, user.user.id);

    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-GitHubActions-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete GitHub Actions integration',
      },
      { status: 500 }
    );
  }
};

const updateGitHubActionsAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new GitHubActionsIntegrationService();

    const result = await service.updateIntegration(tenantId, user.user.id, {
      displayName: body.displayName,
      apiToken: body.apiToken,
      hostUrl: body.hostUrl,
    });

    return json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[BFF-GitHubActions-Update] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update GitHub Actions integration',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createGitHubActionsAction,
  DELETE: deleteGitHubActionsAction,
  PATCH: updateGitHubActionsAction,
});

