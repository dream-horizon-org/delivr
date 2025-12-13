/**
 * API Route: Verify GitHub Actions CI/CD Integration
 * POST /api/v1/tenants/:tenantId/integrations/ci-cd/github-actions/verify
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { GitHubActionsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { apiToken, displayName, hostUrl, _encrypted } = body;

    const result = await GitHubActionsIntegrationService.verifyConnection(
      tenantId,
      userId,
      {
        displayName,
        hostUrl,
        apiToken,
        _encrypted, // Forward encryption flag to backend
      }
    );

    return json(result, { status: result.verified ? 200 : 401 });
  } catch (error: any) {
    console.error('Error verifying GitHub Actions connection:', error);
    return json(
      { verified: false, message: error.message || 'Failed to verify GitHub Actions connection' },
      { status: 500 }
    );
  }
}

