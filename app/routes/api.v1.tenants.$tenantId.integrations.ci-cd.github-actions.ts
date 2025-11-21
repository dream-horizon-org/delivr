/**
 * API Routes: GitHub Actions CI/CD Integration CRUD
 * GET /api/v1/tenants/:tenantId/integrations/ci-cd/github-actions - Get connection
 * POST /api/v1/tenants/:tenantId/integrations/ci-cd/github-actions - Create connection
 * PATCH /api/v1/tenants/:tenantId/integrations/ci-cd/github-actions - Update connection
 * DELETE /api/v1/tenants/:tenantId/integrations/ci-cd/github-actions - Delete connection
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { GitHubActionsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET - Fetch existing GitHub Actions integration
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await GitHubActionsIntegrationService.getIntegration(tenantId, userId);
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error: any) {
    console.error('Error getting GitHub Actions integration:', error);
    return json(
      { success: false, error: error.message || 'Failed to get GitHub Actions integration' },
      { status: 500 }
    );
  }
}

/**
 * POST / PATCH / DELETE - Create, update, or delete GitHub Actions integration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  const method = request.method;

  try {
    // POST - Create new integration
    if (method === 'POST') {
      const body = await request.json();
      const { displayName, apiToken, hostUrl } = body;

      const result = await GitHubActionsIntegrationService.createIntegration(
        tenantId,
        userId,
        {
          displayName,
          apiToken,
          hostUrl,
        }
      );

      return json(result, { status: result.success ? 201 : 500 });
    }

    // PATCH - Update existing integration
    if (method === 'PATCH') {
      const body = await request.json();
      const { integrationId, displayName, apiToken, hostUrl } = body;

      const result = await GitHubActionsIntegrationService.updateIntegration(
        tenantId,
        integrationId, // Service layer will use this to determine backend path
        userId,
        {
          displayName,
          apiToken,
          hostUrl,
        }
      );

      return json(result, { status: result.success ? 200 : 500 });
    }

    // DELETE - Delete integration
    if (method === 'DELETE') {
      const body = await request.json();
      const { integrationId } = body;

      const result = await GitHubActionsIntegrationService.deleteIntegration(tenantId, integrationId, userId);
      return json(result, { status: result.success ? 200 : 500 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error(`Error ${method} GitHub Actions integration:`, error);
    return json(
      { success: false, error: error.message || `Failed to ${method} GitHub Actions integration` },
      { status: 500 }
    );
  }
}

