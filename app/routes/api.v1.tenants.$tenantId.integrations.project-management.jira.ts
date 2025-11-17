/**
 * API Routes: Jira Project Management Integration CRUD
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { JiraIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await JiraIntegrationService.getIntegration(tenantId, userId);
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
      const { 
        displayName, hostUrl, authType, username, apiToken, 
        accessToken, refreshToken, personalAccessToken, 
        cloudId, defaultProjectKey, providerConfig 
      } = body;

      if (!hostUrl || !authType) {
        return json(
          { success: false, error: 'hostUrl and authType are required' },
          { status: 400 }
        );
      }

      const result = await JiraIntegrationService.createIntegration({
        tenantId,
        displayName,
        hostUrl,
        authType,
        username,
        apiToken,
        accessToken,
        refreshToken,
        personalAccessToken,
        cloudId,
        defaultProjectKey,
        providerConfig,
        userId,
      });

      return json(result, { status: result.success ? 201 : 400 });
    }

    if (method === 'PATCH') {
      const body = await request.json();
      const result = await JiraIntegrationService.updateIntegration({
        tenantId,
        ...body,
        userId,
      });

      return json(result, { status: result.success ? 200 : 400 });
    }

    if (method === 'DELETE') {
      const result = await JiraIntegrationService.deleteIntegration(tenantId, userId);
      return json(result, { status: result.success ? 200 : 404 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

