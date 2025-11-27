/**
 * BFF Route: Verify Project Management Credentials
 * Generic route for all PM providers (JIRA, LINEAR, ASANA, etc.)
 * POST /api/v1/tenants/:tenantId/integrations/project-management/verify?providerType=JIRA
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { ProjectManagementProviderType } from '~/.server/services/ReleaseManagement/integrations';

const verifyPMCredentials = async ({
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
    const url = new URL(request.url);
    const providerType = (url.searchParams.get('providerType') || body.providerType || 'JIRA').toUpperCase() as ProjectManagementProviderType;

    // Transform Jira-specific fields to generic format
    const config: any = body.config || {};
    if (body.hostUrl) config.baseUrl = body.hostUrl;
    if (body.baseUrl) config.baseUrl = body.baseUrl;
    if (body.email) config.email = body.email;
    if (body.username) config.email = body.username;
    if (body.apiToken) config.apiToken = body.apiToken;
    if (body.jiraType) config.jiraType = body.jiraType;

    const result = await ProjectManagementIntegrationService.verifyCredentials(
      {
        tenantId,
        providerType,
        config,
      },
      user.user.id
    );

    return json(result);
  } catch (error) {
    console.error('[BFF-PM-Verify] Error:', error);
    return json(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyPMCredentials,
});

