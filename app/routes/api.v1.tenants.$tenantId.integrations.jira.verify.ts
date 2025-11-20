/**
 * BFF Route: Verify Jira Credentials
 * POST /api/v1/tenants/:tenantId/integrations/jira/verify
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { JiraIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

const verifyJiraCredentials = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, verified: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new JiraIntegrationService();

    const result = await service.verifyCredentials(
      {
        config: {
          baseUrl: body.hostUrl || body.baseUrl || body.config?.baseUrl,
          email: body.email || body.username || body.config?.email,
          apiToken: body.apiToken || body.config?.apiToken,
          jiraType: body.jiraType || body.config?.jiraType || 'CLOUD',
        },
      },
      user.user.id
    );

    return json(result);
  } catch (error) {
    console.error('[BFF-Jira-Verify] Error:', error);
    return json(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify Jira credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyJiraCredentials,
});

