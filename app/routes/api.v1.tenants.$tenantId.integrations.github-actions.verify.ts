/**
 * BFF Route: Verify GitHub Actions Credentials
 * POST /api/v1/tenants/:tenantId/integrations/github-actions/verify
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { GitHubActionsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

const verifyGitHubActionsCredentials = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new GitHubActionsIntegrationService();

    const result = await service.verifyConnection(tenantId, user.user.id, {
      apiToken: body.apiToken,
    });

    return json(result);
  } catch (error) {
    console.error('[BFF-GitHubActions-Verify] Error:', error);
    return json(
      {
        verified: false,
        message: error instanceof Error ? error.message : 'Failed to verify GitHub Actions credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyGitHubActionsCredentials,
});

