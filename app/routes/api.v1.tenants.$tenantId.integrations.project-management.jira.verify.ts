/**
 * API Route: Verify Jira Project Management Integration
 * GET /api/v1/tenants/:tenantId/integrations/project-management/jira/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { JiraIntegrationService, JiraAuthType } from '~/.server/services/ReleaseManagement/integrations/jira-integration';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const hostUrl = url.searchParams.get('hostUrl');
    const authType = url.searchParams.get('authType') as JiraAuthType;
    const username = url.searchParams.get('username');
    const apiToken = url.searchParams.get('apiToken');
    const accessToken = url.searchParams.get('accessToken');
    const personalAccessToken = url.searchParams.get('personalAccessToken');

    if (!hostUrl || !authType) {
      return json(
        { verified: false, message: 'hostUrl and authType are required' },
        { status: 400 }
      );
    }

    const result = await JiraIntegrationService.verifyJira({
      tenantId,
      hostUrl,
      authType,
      username: username || undefined,
      apiToken: apiToken || undefined,
      accessToken: accessToken || undefined,
      personalAccessToken: personalAccessToken || undefined,
      userId,
    });

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

