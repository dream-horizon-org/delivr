/**
 * BFF API Routes: Test Management Integration CRUD (Tenant-Level)
 * Proxies to backend: /test-management/tenants/:tenantId/integrations
 * 
 * GET    /api/v1/tenants/:tenantId/integrations/test-management - List integrations
 * POST   /api/v1/tenants/:tenantId/integrations/test-management - Create integration
 * PUT    /api/v1/tenants/:tenantId/integrations/test-management/:integrationId - Update integration  
 * DELETE /api/v1/tenants/:tenantId/integrations/test-management/:integrationId - Delete integration
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';
import type { UpdateCheckmateIntegrationRequest } from '~/.server/services/ReleaseManagement/integrations/checkmate-integration';

/**
 * GET - List all test management integrations for tenant
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await CheckmateIntegrationService.listIntegrations(tenantId, userId);
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error: any) {
    console.error('[Test Management] Error listing integrations:', error);
    return json(
      { success: false, error: error.message || 'Failed to list test management integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST / PUT / DELETE - Create, update, or delete test management integration
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
      const { name, providerType, config } = body;

      if (!name) {
        return json({ success: false, error: 'Name is required' }, { status: 400 });
      }

      if (!providerType) {
        return json({ success: false, error: 'Provider type is required' }, { status: 400 });
      }

      if (!config || !config.baseUrl || !config.authToken) {
        return json(
          { success: false, error: 'Config with baseUrl, authToken, and orgId is required' },
          { status: 400 }
        );
      }

      if (!config.orgId) {
        return json(
          { success: false, error: 'Organization ID (orgId) is required' },
          { status: 400 }
        );
      }

      const result = await CheckmateIntegrationService.createIntegration({
        tenantId,
        name,
        config: {
          baseUrl: config.baseUrl,
          authToken: config.authToken,
          orgId: config.orgId
        },
        userId
      });

      return json(result, { status: result.success ? 201 : 500 });
    }

    // PUT - Update existing integration
    if (method === 'PUT') {
      const url = new URL(request.url);
      const integrationId = url.pathname.split('/').pop();

      if (!integrationId || integrationId === 'test-management') {
        return json({ success: false, error: 'Integration ID is required for update' }, { status: 400 });
      }

      const body = await request.json();
      const { name, providerType, config } = body;

      // Build update payload - only include fields that are provided
      const updatePayload: UpdateCheckmateIntegrationRequest = {
        integrationId,
        userId,
        ...(name && { name }),
        ...(config && {
          config: {
            ...(config.baseUrl && { baseUrl: config.baseUrl }),
            ...(config.authToken && { authToken: config.authToken }),
            ...(config.orgId && { orgId: config.orgId })
          }
        })
      };

      const result = await CheckmateIntegrationService.updateIntegration(updatePayload, userId);

      return json(result, { status: result.success ? 200 : 500 });
    }

    // DELETE - Delete integration
    if (method === 'DELETE') {
      const url = new URL(request.url);
      const integrationId = url.pathname.split('/').pop();

      if (!integrationId || integrationId === 'test-management') {
        return json({ success: false, error: 'Integration ID is required for delete' }, { status: 400 });
      }

      const result = await CheckmateIntegrationService.deleteIntegration(integrationId, userId);
      return json(result, { status: result.success ? 200 : 500 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[Test Management] Action error:', error);
    return json(
      { success: false, error: error.message || 'Failed to perform operation' },
      { status: 500 }
    );
  }
}

