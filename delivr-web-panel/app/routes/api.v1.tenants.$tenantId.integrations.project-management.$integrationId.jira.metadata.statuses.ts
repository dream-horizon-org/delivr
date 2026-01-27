/**
 * BFF Route: Fetch Jira Statuses for a Project
 * GET /api/v1/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/statuses?projectKey={projectKey}
 * 
 * Fetches all Jira statuses for a specific project
 * This is a proxy route that calls the backend Jira metadata service
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, request, user }: LoaderFunctionArgs & { user: any }) => {
  const { tenantId, integrationId } = params;
  
  // Extract projectKey from query params
  const url = new URL(request.url);
  const projectKey = url.searchParams.get('projectKey');

  if (!tenantId) {
    return json(
      { success: false, error: 'Tenant ID is required' },
      { status: 400 }
    );
  }

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  if (!projectKey) {
    return json(
      { success: false, error: 'Project key is required as a query parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await ProjectManagementIntegrationService.getJiraStatuses(
      tenantId,
      integrationId,
      projectKey,
      user.user.id
    );

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to fetch Jira statuses' },
        { status: 500 }
      );
    }

    return json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error('[Jira Statuses API] Error fetching statuses:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Jira statuses' 
      },
      { status: 500 }
    );
  }
});

