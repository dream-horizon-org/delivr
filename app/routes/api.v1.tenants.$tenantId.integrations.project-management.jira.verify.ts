/**
 * API Route: Verify Jira Project Management Integration
 * GET /api/v1/tenants/:tenantId/integrations/project-management/jira/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { JiraIntegrationService } from '~/.server/services/ReleaseManagement/integrations/jira-integration';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const baseUrl = url.searchParams.get('baseUrl') || url.searchParams.get('hostUrl');
    const email = url.searchParams.get('email') || url.searchParams.get('username');
    const apiToken = url.searchParams.get('apiToken');
    const jiraType = url.searchParams.get('jiraType') || 'CLOUD';

    if (!baseUrl || !email || !apiToken) {
      return json(
        { verified: false, message: 'baseUrl, email, and apiToken are required' },
        { status: 400 }
      );
    }

    const result = await JiraIntegrationService.verifyCredentials({
      projectId: tenantId, // tenantId is used as projectId for backward compatibility
      tenantId: tenantId,
      config: {
        baseUrl,
        email,
        apiToken,
        jiraType: jiraType as 'CLOUD' | 'SERVER' | 'DATA_CENTER',
      }
    }, userId);

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    console.error('[Jira Verify] Error:', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

