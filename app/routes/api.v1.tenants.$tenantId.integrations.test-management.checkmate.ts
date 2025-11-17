/**
 * API Routes: Checkmate Test Management Integration CRUD
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await CheckmateIntegrationService.getIntegration(tenantId, userId);
    return json(result, { status: result.success ? 200 : 404 });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const method = request.method;

    if (method === 'POST') {
      const body = await request.json();
      const { displayName, hostUrl, apiKey, workspaceId, providerConfig } = body;

      if (!hostUrl || !apiKey || !workspaceId) {
        return json(
          { success: false, error: 'hostUrl, apiKey, and workspaceId are required' },
          { status: 400 }
        );
      }

      const result = await CheckmateIntegrationService.createIntegration({
        tenantId,
        displayName,
        hostUrl,
        apiKey,
        workspaceId,
        providerConfig,
        userId,
      });

      return json(result, { status: result.success ? 201 : 400 });
    }

    if (method === 'PATCH') {
      const body = await request.json();
      const result = await CheckmateIntegrationService.updateIntegration({
        tenantId,
        ...body,
        userId,
      });

      return json(result, { status: result.success ? 200 : 400 });
    }

    if (method === 'DELETE') {
      const result = await CheckmateIntegrationService.deleteIntegration(tenantId, userId);
      return json(result, { status: result.success ? 200 : 404 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

