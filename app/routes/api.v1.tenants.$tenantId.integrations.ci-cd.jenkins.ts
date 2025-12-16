/**
 * API Routes: Jenkins CI/CD Integration CRUD
 * POST   /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins - Create
 * GET    /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins - Read
 * PATCH  /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins - Update
 * DELETE /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins - Delete
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { JenkinsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET - Retrieve Jenkins integration
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await JenkinsIntegrationService.getIntegration(tenantId, userId);

    if (result.success) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 404 });
    }
  } catch (error: any) {
    console.error('[Jenkins Get] Error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create Jenkins integration
 * PATCH - Update Jenkins integration
 * DELETE - Delete Jenkins integration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const method = request.method;

    // CREATE
    if (method === 'POST') {
      const body = await request.json();
      const { displayName, hostUrl, username, apiToken, providerConfig, _encrypted } = body;

      if (!hostUrl || !username || !apiToken) {
        return json(
          { success: false, error: 'hostUrl, username, and apiToken are required' },
          { status: 400 }
        );
      }

      console.log('[Jenkins Create] _encrypted:', _encrypted);

      const result = await JenkinsIntegrationService.createIntegration({
        tenantId,
        displayName,
        hostUrl,
        username,
        apiToken,
        providerConfig,
        userId,
        _encrypted, // Forward encryption flag to backend
      });

      if (result.success) {
        return json(result, { status: 201 });
      } else {
        return json(result, { status: 400 });
      }
    }

    // UPDATE
    if (method === 'PATCH') {
      const body = await request.json();
      const { integrationId, displayName, hostUrl, username, apiToken, providerConfig, _encrypted } = body;

      console.log('[Jenkins Update] _encrypted:', _encrypted);

      const result = await JenkinsIntegrationService.updateIntegration({
        tenantId,
        integrationId, // Service layer will use this to determine backend path
        displayName,
        hostUrl,
        username,
        apiToken,
        providerConfig,
        userId,
        _encrypted, // Forward encryption flag to backend
      });

      if (result.success) {
        return json(result, { status: 200 });
      } else {
        return json(result, { status: 400 });
      }
    }

    // DELETE
    if (method === 'DELETE') {
      const body = await request.json();
      const { integrationId } = body;

      const result = await JenkinsIntegrationService.deleteIntegration(tenantId, integrationId, userId);

      if (result.success) {
        return json(result, { status: 200 });
      } else {
        return json(result, { status: 404 });
      }
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error(`[Jenkins ${request.method}] Error:`, error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

