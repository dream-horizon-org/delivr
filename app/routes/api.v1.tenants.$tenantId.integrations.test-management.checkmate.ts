/**
 * API Routes: Checkmate Test Management Integration CRUD
 * GET /api/v1/tenants/:tenantId/integrations/test-management/checkmate - Get integrations
 * POST /api/v1/tenants/:tenantId/integrations/test-management/checkmate - Create integration
 * PUT /api/v1/tenants/:tenantId/integrations/test-management/checkmate/:integrationId - Update integration
 * DELETE /api/v1/tenants/:tenantId/integrations/test-management/checkmate/:integrationId - Delete integration
 * POST /api/v1/tenants/:tenantId/integrations/test-management/checkmate/:integrationId/verify - Verify integration
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET - Fetch all Checkmate integrations for tenant/project
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    // Backend uses projectId, but frontend sends tenantId
    const projectId = tenantId;
    const result = await CheckmateIntegrationService.listIntegrations(projectId, userId);
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error: any) {
    console.error('Error getting Checkmate integrations:', error);
    return json(
      { success: false, error: error.message || 'Failed to get Checkmate integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST / PUT / DELETE - Create, update, or delete Checkmate integration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  const method = request.method;
  const projectId = tenantId; // Backend uses projectId

  try {
    // POST - Create new integration
    if (method === 'POST') {
      const body = await request.json();
      const { name, config } = body;

      if (!name) {
        return json({ success: false, error: 'Name is required' }, { status: 400 });
      }

      if (!config || !config.baseUrl || !config.authToken) {
        return json(
          { success: false, error: 'Config with baseUrl and authToken is required' },
          { status: 400 }
        );
      }

      const result = await CheckmateIntegrationService.createIntegration({
        projectId,
        name,
        config: {
          baseUrl: config.baseUrl,
          authToken: config.authToken
        },
        userId
      });

      return json(result, { status: result.success ? 201 : 500 });
    }

    // PUT - Update existing integration
    if (method === 'PUT') {
      const url = new URL(request.url);
      const integrationId = url.pathname.split('/').pop();

      if (!integrationId || integrationId === 'checkmate') {
        return json({ success: false, error: 'Integration ID is required for update' }, { status: 400 });
      }

      const body = await request.json();
      const { name, config } = body;

      const result = await CheckmateIntegrationService.updateIntegration({
        projectId,
        integrationId,
        name,
        config,
        userId
      });

      return json(result, { status: result.success ? 200 : 500 });
    }

    // DELETE - Delete integration
    if (method === 'DELETE') {
      const url = new URL(request.url);
      const integrationId = url.pathname.split('/').pop();

      if (!integrationId || integrationId === 'checkmate') {
        return json({ success: false, error: 'Integration ID is required for delete' }, { status: 400 });
      }

      const result = await CheckmateIntegrationService.deleteIntegration(projectId, integrationId, userId);
      return json(result, { status: result.success ? 200 : 500 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error(`Error ${method} Checkmate integration:`, error);
    return json(
      { success: false, error: error.message || `Failed to ${method} Checkmate integration` },
      { status: 500 }
    );
  }
}
